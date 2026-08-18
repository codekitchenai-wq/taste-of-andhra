/**
 * Seeds Devi Home Foods test tenant (Starter / Direct UPI).
 *
 * Admin:    demoadmin@devihomefoods.test / Test@123
 * Customer: democustomer@devihomefoods.test / Test@123
 * Delivery: demodelivery@devihomefoods.test / Test@123
 *
 * Usage: node scripts/seed-devihomefoods.mjs
 * Requires: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { demoPersonaEmail, phoneForTenantPersona } from './lib/tenant-demo-accounts.mjs'

const STARTER_PLAN_ID = 'b0000000-0000-4000-8000-000000000001'
const PASSWORD = 'Test@123'
const SLUG = 'devihomefoods'
const ORG_NAME = 'Devi Home Foods'

const ADMIN = {
  email: demoPersonaEmail(SLUG, 'admin'),
  password: PASSWORD,
  fullName: 'Devi Home Foods Admin',
  phone: phoneForTenantPersona(SLUG, 'admin'),
  role: 'admin',
}

const DELIVERY = {
  email: demoPersonaEmail(SLUG, 'delivery'),
  password: PASSWORD,
  fullName: 'Devi Home Foods Delivery',
  phone: phoneForTenantPersona(SLUG, 'delivery'),
  role: 'delivery',
}

const CUSTOMER = {
  email: demoPersonaEmail(SLUG, 'customer'),
  password: PASSWORD,
  fullName: 'Devi Home Foods Demo Customer',
  phone: phoneForTenantPersona(SLUG, 'customer'),
  role: 'customer',
}

const MENU = [
  {
    category: 'Starters',
    name: 'Mirchi Bajji',
    price: 120,
    is_veg: true,
    spice_level: 'hot',
    description: 'Crispy stuffed green chilli fritters',
    preparation_time: 15,
    is_featured: true,
  },
  {
    category: 'Starters',
    name: 'Chicken Pakora',
    price: 180,
    is_veg: false,
    spice_level: 'medium',
    description: 'Spiced chicken fritters',
    preparation_time: 20,
    is_featured: false,
  },
  {
    category: 'Main Course',
    name: 'Gongura Chicken',
    price: 280,
    is_veg: false,
    spice_level: 'hot',
    description: 'Andhra-style chicken with sorrel leaves',
    preparation_time: 35,
    is_featured: true,
  },
  {
    category: 'Main Course',
    name: 'Pesarattu',
    price: 140,
    is_veg: true,
    spice_level: 'mild',
    description: 'Green gram dosa with ginger chutney',
    preparation_time: 20,
    is_featured: true,
  },
  {
    category: 'Main Course',
    name: 'Andhra Veg Thali',
    price: 220,
    is_veg: true,
    spice_level: 'medium',
    description: 'Rice, sambar, two curries, pickle, papad',
    preparation_time: 25,
    is_featured: true,
  },
  {
    category: 'Main Course',
    name: 'Royyala Iguru',
    price: 320,
    is_veg: false,
    spice_level: 'hot',
    description: 'Prawn curry home-style',
    preparation_time: 30,
    is_featured: false,
  },
  {
    category: 'Rice',
    name: 'Pulihora',
    price: 100,
    is_veg: true,
    spice_level: 'medium',
    description: 'Tangy tamarind rice',
    preparation_time: 15,
    is_featured: false,
  },
  {
    category: 'Rice',
    name: 'Ghee Rice',
    price: 130,
    is_veg: true,
    spice_level: 'mild',
    description: 'Fragrant rice tempered with ghee',
    preparation_time: 20,
    is_featured: false,
  },
  {
    category: 'Beverages',
    name: 'Nannari Sharbat',
    price: 60,
    is_veg: true,
    spice_level: 'mild',
    description: 'Cooling sarsaparilla drink',
    preparation_time: 5,
    is_featured: false,
  },
  {
    category: 'Sweets',
    name: 'Pootharekulu',
    price: 90,
    is_veg: true,
    spice_level: 'mild',
    description: 'Paper-thin sweet with jaggery and ghee',
    preparation_time: 10,
    is_featured: true,
  },
]

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const env = {}
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[trimmed.slice(0, eq).trim()] = value
  }
  return env
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

const root = resolve(import.meta.dirname, '..')
const fileEnv = {
  ...loadEnvFile(resolve(root, '.env')),
  ...loadEnvFile(resolve(root, '.env.local')),
}
const url = process.env.VITE_SUPABASE_URL?.trim() || fileEnv.VITE_SUPABASE_URL
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  fileEnv.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  )
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function ensureAuthUser(account) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (listed.error) throw new Error(listed.error.message)

  const existing = (listed.data?.users ?? []).find(
    (user) => user.email?.toLowerCase() === account.email.toLowerCase(),
  )

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
      user_metadata: {
        full_name: account.fullName,
        role: account.role,
        phone: account.phone,
      },
    })
    if (error) throw new Error(`updateUser ${account.email}: ${error.message}`)
    return { id: existing.id, created: false }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: {
      full_name: account.fullName,
      role: account.role,
      phone: account.phone,
    },
  })
  if (error) throw new Error(`createUser ${account.email}: ${error.message}`)
  return { id: data.user.id, created: true }
}

async function upsertProfile(userId, account) {
  const { error } = await admin.from('profiles').upsert(
    {
      id: userId,
      email: account.email,
      full_name: account.fullName,
      phone: account.phone,
      role: account.role,
      is_active: true,
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(`profile ${account.email}: ${error.message}`)
}

async function main() {
  console.log('Seeding Devi Home Foods…')

  let orgId
  const { data: existingOrg, error: orgFindError } = await admin
    .from('organizations')
    .select('id, name, slug, status')
    .eq('slug', SLUG)
    .maybeSingle()

  if (orgFindError) throw new Error(orgFindError.message)

  if (existingOrg?.id) {
    orgId = existingOrg.id
    console.log(`Org exists: ${orgId}`)
    const { error: updateError } = await admin
      .from('organizations')
      .update({
        name: ORG_NAME,
        status: 'active',
        phone: '9876500100',
        email: ADMIN.email,
        address: 'Hyderabad',
        settings: {
          onboarded_by: 'seed-devihomefoods',
          owner_name: ADMIN.fullName,
          owner_phone: ADMIN.phone,
        },
      })
      .eq('id', orgId)
    if (updateError) throw new Error(`org update: ${updateError.message}`)
  } else {
    orgId = randomUUID()
    const { error } = await admin.from('organizations').insert({
      id: orgId,
      name: ORG_NAME,
      slug: SLUG,
      status: 'active',
      phone: '9876500100',
      email: ADMIN.email,
      address: 'Hyderabad',
      branding: {},
      opening_hours: {},
      settings: {
        onboarded_by: 'seed-devihomefoods',
        owner_name: ADMIN.fullName,
        owner_phone: ADMIN.phone,
      },
    })
    if (error) throw new Error(`org insert: ${error.message}`)
    console.log(`Org created: ${orgId}`)
  }

  const periodEnd = new Date()
  periodEnd.setFullYear(periodEnd.getFullYear() + 1)

  const { data: sub } = await admin
    .from('subscriptions')
    .select('id')
    .eq('organization_id', orgId)
    .in('status', ['trialing', 'active', 'past_due'])
    .maybeSingle()

  if (sub?.id) {
    await admin
      .from('subscriptions')
      .update({
        plan_id: STARTER_PLAN_ID,
        status: 'active',
        current_period_end: periodEnd.toISOString(),
        provider: 'manual',
        provider_ref: 'seed-devihomefoods',
      })
      .eq('id', sub.id)
  } else {
    const { error } = await admin.from('subscriptions').insert({
      organization_id: orgId,
      plan_id: STARTER_PLAN_ID,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      provider: 'manual',
      provider_ref: 'seed-devihomefoods',
    })
    if (error) throw new Error(`subscription: ${error.message}`)
  }

  // Explicitly keep Razorpay off for Starter verification
  await admin.from('organization_entitlements').upsert(
    {
      organization_id: orgId,
      feature_key: 'payments_razorpay',
      enabled: false,
      source: 'manual',
      notes: 'Starter test tenant — Direct UPI only',
    },
    { onConflict: 'organization_id,feature_key' },
  )
  await admin.from('organization_entitlements').upsert(
    {
      organization_id: orgId,
      feature_key: 'payments_direct_upi',
      enabled: true,
      source: 'manual',
      notes: 'Starter test tenant',
    },
    { onConflict: 'organization_id,feature_key' },
  )

  for (const row of [
    { key: 'upi_vpa', value: 'devihomefoods@upi' },
    { key: 'upi_payee_name', value: ORG_NAME },
  ]) {
    const { error } = await admin.from('app_settings').upsert(
      {
        organization_id: orgId,
        key: row.key,
        value: row.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,key' },
    )
    if (error) {
      // Some DBs still use key-only uniqueness — try update/insert fallback
      const existing = await admin
        .from('app_settings')
        .select('key')
        .eq('organization_id', orgId)
        .eq('key', row.key)
        .maybeSingle()
      if (existing.data) {
        await admin
          .from('app_settings')
          .update({ value: row.value, updated_at: new Date().toISOString() })
          .eq('organization_id', orgId)
          .eq('key', row.key)
      } else {
        const insert = await admin.from('app_settings').insert({
          organization_id: orgId,
          key: row.key,
          value: row.value,
        })
        if (insert.error) {
          console.warn(`app_settings ${row.key}: ${insert.error.message}`)
        }
      }
    }
  }

  // Categories + dishes (replace prior seed dishes for this org)
  const { data: oldDishes } = await admin
    .from('dishes')
    .select('id')
    .eq('organization_id', orgId)
  if (oldDishes?.length) {
    await admin
      .from('dishes')
      .delete()
      .eq('organization_id', orgId)
  }

  const categoryNames = [...new Set(MENU.map((item) => item.category))]
  const categoryIds = new Map()

  for (const [index, categoryName] of categoryNames.entries()) {
    const slug = slugify(`${categoryName}-${SLUG}-${index + 1}`)
    const { data: existingCat } = await admin
      .from('categories')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', categoryName)
      .maybeSingle()

    if (existingCat?.id) {
      categoryIds.set(categoryName, existingCat.id)
      await admin
        .from('categories')
        .update({ is_active: true, display_order: index + 1 })
        .eq('id', existingCat.id)
      continue
    }

    const { data, error } = await admin
      .from('categories')
      .insert({
        organization_id: orgId,
        name: categoryName,
        slug,
        display_order: index + 1,
        is_active: true,
      })
      .select('id')
      .single()
    if (error) throw new Error(`category ${categoryName}: ${error.message}`)
    categoryIds.set(categoryName, data.id)
  }

  let dishCount = 0
  for (const [index, item] of MENU.entries()) {
    const { error } = await admin.from('dishes').insert({
      organization_id: orgId,
      category_id: categoryIds.get(item.category),
      name: item.name,
      slug: slugify(`${item.name}-${SLUG}-${index + 1}`),
      description: item.description,
      price: item.price,
      is_veg: item.is_veg,
      spice_level: item.spice_level,
      preparation_time: item.preparation_time,
      is_available: true,
      is_featured: item.is_featured,
    })
    if (error) throw new Error(`dish ${item.name}: ${error.message}`)
    dishCount += 1
  }

  const adminUser = await ensureAuthUser(ADMIN)
  await upsertProfile(adminUser.id, ADMIN)
  const { error: memberError } = await admin.from('organization_members').upsert(
    {
      organization_id: orgId,
      user_id: adminUser.id,
      role: 'restaurant_owner',
      is_active: true,
    },
    { onConflict: 'organization_id,user_id' },
  )
  if (memberError) throw new Error(`org member: ${memberError.message}`)

  const deliveryUser = await ensureAuthUser(DELIVERY)
  await upsertProfile(deliveryUser.id, DELIVERY)
  const { error: deliveryMemberError } = await admin.from('organization_members').upsert(
    {
      organization_id: orgId,
      user_id: deliveryUser.id,
      role: 'delivery',
      is_active: true,
    },
    { onConflict: 'organization_id,user_id' },
  )
  if (deliveryMemberError) {
    throw new Error(`delivery member: ${deliveryMemberError.message}`)
  }

  const customerUser = await ensureAuthUser(CUSTOMER)
  await upsertProfile(customerUser.id, CUSTOMER)
  await admin.from('organization_customers').upsert(
    {
      organization_id: orgId,
      user_id: customerUser.id,
    },
    { onConflict: 'organization_id,user_id' },
  )

  console.log('')
  console.log('Ready — Devi Home Foods (Starter / Direct UPI)')
  console.log(`  Organization id: ${orgId}`)
  console.log(`  Slug:            ${SLUG}`)
  console.log(`  Menu dishes:     ${dishCount}`)
  console.log(`  UPI VPA:         devihomefoods@upi (change in Admin → Settings)`)
  console.log('')
  console.log('Admin login')
  console.log(`  Email:    ${ADMIN.email}`)
  console.log(`  Password: ${PASSWORD}`)
  console.log('  URL:      /admin/login')
  console.log('')
  console.log('Customer demo login')
  console.log(`  Email:    ${CUSTOMER.email}`)
  console.log(`  Password: ${PASSWORD}`)
  console.log('  URL:      /login')
  console.log('')
  console.log('Delivery demo login')
  console.log(`  Email:    ${DELIVERY.email}`)
  console.log(`  Password: ${PASSWORD}`)
  console.log('  URL:      /delivery/login')
  console.log('')
  console.log('Master: /master/tenants → Subscription & details for this tenant')
  console.log(
    'Storefront: use subdomain host for this slug if host-tenant resolution is enabled.',
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
