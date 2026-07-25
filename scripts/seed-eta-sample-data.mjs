/**
 * Seeds app_settings default ETA and sample orders with varied delivery times
 * (on-time, nearly due, delayed) for kitchen / customer demos.
 *
 * Requires in .env.local:
 *   VITE_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Prefers demo customer: customer@tasteofandhra.test (run npm run seed:demo-users first).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {}

  const env = {}
  const content = readFileSync(filePath, 'utf8')

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eq = trimmed.indexOf('=')
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    env[key] = value
  }

  return env
}

const root = resolve(import.meta.dirname, '..')
const fileEnv = {
  ...loadEnvFile(resolve(root, '.env')),
  ...loadEnvFile(resolve(root, '.env.local')),
}

const supabaseUrl =
  process.env.VITE_SUPABASE_URL?.trim() || fileEnv.VITE_SUPABASE_URL?.trim()
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  fileEnv.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL in .env.local')
  process.exit(1)
}

if (!serviceRoleKey) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY in .env.local\n' +
      'Get it from: Supabase Dashboard → Project Settings → API → service_role',
  )
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

function orderNumber(suffix) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `TOA-ETA-${datePart}-${suffix}`
}

const SAMPLE_ORDERS = [
  {
    suffix: 'D1',
    status: 'preparing',
    etaMinutes: -25,
    note: 'Sample delayed order (overdue 25m)',
  },
  {
    suffix: 'D2',
    status: 'out_for_delivery',
    etaMinutes: -12,
    note: 'Sample delayed rider order',
  },
  {
    suffix: 'N1',
    status: 'confirmed',
    etaMinutes: 8,
    note: 'Sample nearly due order',
  },
  {
    suffix: 'O1',
    status: 'preparing',
    etaMinutes: 35,
    note: 'Sample on-time order',
  },
  {
    suffix: 'O2',
    status: 'ready',
    etaMinutes: 18,
    note: 'Sample ready on-time order',
  },
]

async function ensureSettings() {
  const { error } = await admin.from('app_settings').upsert(
    {
      key: 'default_eta_minutes',
      value: '45',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  )

  if (error) {
    console.error('Failed to upsert app_settings:', error.message)
    console.error(
      'Run migration 20260726020000_order_eta_settings.sql in Supabase first.',
    )
    process.exit(1)
  }

  console.log('OK app_settings.default_eta_minutes = 45')
}

async function resolveCustomer() {
  const { data: demo, error: demoError } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', 'customer@tasteofandhra.test')
    .maybeSingle()

  if (demoError) {
    console.error('Failed to look up demo customer:', demoError.message)
    process.exit(1)
  }

  if (demo) return demo

  const { data: anyCustomer, error } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'customer')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Failed to find a customer profile:', error.message)
    process.exit(1)
  }

  if (!anyCustomer) {
    console.error(
      'No customer profile found. Run: npm run seed:demo-users',
    )
    process.exit(1)
  }

  console.log(
    `Demo customer missing; using ${anyCustomer.email ?? anyCustomer.id}`,
  )
  return anyCustomer
}

async function ensureAddress(userId) {
  const { data: existing, error: listError } = await admin
    .from('addresses')
    .select('id')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (listError) {
    console.error('Failed to load addresses:', listError.message)
    process.exit(1)
  }

  if (existing) return existing.id

  const { data: created, error } = await admin
    .from('addresses')
    .insert({
      user_id: userId,
      address_type: 'home',
      full_name: 'Demo Customer',
      phone: '9876543210',
      address_line1: '12 Sample Street',
      address_line2: 'Near Temple',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
      latitude: 17.385,
      longitude: 78.4867,
      is_default: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create address:', error.message)
    process.exit(1)
  }

  console.log('Created sample delivery address')
  return created.id
}

async function resolveDish() {
  const { data, error } = await admin
    .from('dishes')
    .select('id, name, price')
    .eq('is_available', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Failed to load dishes:', error.message)
    process.exit(1)
  }

  if (!data) {
    console.error('No available dishes found. Seed the menu first.')
    process.exit(1)
  }

  return data
}

async function upsertSampleOrder({
  customerId,
  addressId,
  dish,
  sample,
}) {
  const number = orderNumber(sample.suffix)
  const subtotal = Number(dish.price)
  const tax = Math.round(subtotal * 0.05)
  const deliveryCharge = 49
  const total = subtotal + tax + deliveryCharge
  const estimatedDelivery = minutesFromNow(sample.etaMinutes)

  const payload = {
    order_number: number,
    user_id: customerId,
    address_id: addressId,
    subtotal,
    tax,
    delivery_charge: deliveryCharge,
    discount: 0,
    total,
    payment_method: 'cod',
    payment_status: 'pending',
    order_status: sample.status,
    special_instructions: sample.note,
    estimated_delivery: estimatedDelivery,
  }

  const { data: existing } = await admin
    .from('orders')
    .select('id')
    .eq('order_number', number)
    .maybeSingle()

  let orderId = existing?.id

  if (orderId) {
    const { error } = await admin
      .from('orders')
      .update({
        order_status: sample.status,
        estimated_delivery: estimatedDelivery,
        special_instructions: sample.note,
      })
      .eq('id', orderId)

    if (error) {
      console.error(`FAIL update ${number}: ${error.message}`)
      return
    }
  } else {
    const { data, error } = await admin
      .from('orders')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      console.error(`FAIL insert ${number}: ${error.message}`)
      return
    }

    orderId = data.id

    const { error: itemError } = await admin.from('order_items').insert({
      order_id: orderId,
      dish_id: dish.id,
      quantity: 1,
      price: dish.price,
      total: dish.price,
    })

    if (itemError) {
      console.error(`FAIL items ${number}: ${itemError.message}`)
    }

    await admin.from('payments').insert({
      order_id: orderId,
      payment_gateway: 'cod',
      amount: total,
      status: 'pending',
    })
  }

  if (sample.status === 'out_for_delivery') {
    const { data: delivery } = await admin
      .from('delivery')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle()

    if (!delivery) {
      await admin.from('delivery').insert({
        order_id: orderId,
        delivery_partner: 'Demo Delivery',
        partner_phone: '9876543212',
        status: 'out_for_delivery',
        assigned_at: new Date().toISOString(),
      })
    }
  }

  const label =
    sample.etaMinutes < 0
      ? `delayed ${Math.abs(sample.etaMinutes)}m`
      : `ETA +${sample.etaMinutes}m`

  console.log(`OK ${number.padEnd(24)} ${sample.status.padEnd(18)} ${label}`)
}

async function backfillOpenOrders() {
  const { data, error } = await admin
    .from('orders')
    .select('id, order_status, estimated_delivery, created_at')
    .is('estimated_delivery', null)
    .not('order_status', 'in', '(delivered,cancelled)')

  if (error) {
    console.warn('Backfill skipped:', error.message)
    return
  }

  for (const row of data ?? []) {
    const eta = new Date(
      new Date(row.created_at).getTime() + 45 * 60_000,
    ).toISOString()
    await admin
      .from('orders')
      .update({ estimated_delivery: eta })
      .eq('id', row.id)
  }

  if ((data ?? []).length > 0) {
    console.log(`Backfilled ETA on ${data.length} open order(s)`)
  }
}

async function main() {
  await ensureSettings()
  await backfillOpenOrders()

  const customer = await resolveCustomer()
  const addressId = await ensureAddress(customer.id)
  const dish = await resolveDish()

  console.log(`\nSeeding sample ETA orders for ${customer.email}…`)

  for (const sample of SAMPLE_ORDERS) {
    await upsertSampleOrder({
      customerId: customer.id,
      addressId,
      dish,
      sample,
    })
  }

  console.log('\nDone. Open Admin → Orders to see Delayed / ETA badges.')
  console.log('Customer order list will show remaining time too.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
