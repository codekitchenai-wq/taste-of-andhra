/**
 * Seeds QA coupon codes into the offers table.
 *
 * Requires in .env.local:
 *   VITE_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
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

const today = new Date()
const startDate = today.toISOString().slice(0, 10)
const end = new Date(today)
end.setFullYear(end.getFullYear() + 1)
const endDate = end.toISOString().slice(0, 10)

/** @type {Array<{
 *   title: string
 *   description: string
 *   discount_percentage: number
 *   minimum_order: number
 *   coupon_code: string
 *   start_date: string
 *   end_date: string
 *   is_active: boolean
 * }>} */
const COUPONS = [
  {
    title: 'QA 10% off',
    description: 'Test coupon: 10% off any order (no minimum).',
    discount_percentage: 10,
    minimum_order: 0,
    coupon_code: 'TEST10',
    start_date: startDate,
    end_date: endDate,
    is_active: true,
  },
  {
    title: 'QA Welcome 15%',
    description: 'Test coupon: 15% off with minimum order ₹300.',
    discount_percentage: 15,
    minimum_order: 300,
    coupon_code: 'WELCOME15',
    start_date: startDate,
    end_date: endDate,
    is_active: true,
  },
  {
    title: 'QA Big Order 20%',
    description: 'Test coupon: 20% off with minimum order ₹500.',
    discount_percentage: 20,
    minimum_order: 500,
    coupon_code: 'SAVE20',
    start_date: startDate,
    end_date: endDate,
    is_active: true,
  },
  {
    title: 'QA Flat fest 25%',
    description: 'Test coupon: 25% off with minimum order ₹1000.',
    discount_percentage: 25,
    minimum_order: 1000,
    coupon_code: 'FESTIVE25',
    start_date: startDate,
    end_date: endDate,
    is_active: true,
  },
  {
    title: 'QA Expired (invalid)',
    description: 'Expired coupon for negative testing — should be rejected.',
    discount_percentage: 50,
    minimum_order: 0,
    coupon_code: 'EXPIRED50',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    is_active: true,
  },
  {
    title: 'QA Inactive (invalid)',
    description: 'Inactive coupon for negative testing — should be rejected.',
    discount_percentage: 30,
    minimum_order: 0,
    coupon_code: 'INACTIVE30',
    start_date: startDate,
    end_date: endDate,
    is_active: false,
  },
]

async function main() {
  const { data: existing, error: listError } = await admin
    .from('offers')
    .select(
      'id,title,coupon_code,discount_percentage,minimum_order,start_date,end_date,is_active',
    )
    .order('coupon_code', { ascending: true })

  if (listError) {
    console.error('Failed to list offers:', listError.message)
    process.exit(1)
  }

  console.log(`Existing offers: ${existing?.length ?? 0}`)

  for (const coupon of COUPONS) {
    const { data, error } = await admin
      .from('offers')
      .upsert(coupon, { onConflict: 'coupon_code' })
      .select(
        'coupon_code,title,discount_percentage,minimum_order,start_date,end_date,is_active',
      )
      .single()

    if (error) {
      console.error(`FAIL ${coupon.coupon_code}: ${error.message}`)
      continue
    }

    console.log(
      `OK ${data.coupon_code.padEnd(12)} ${data.discount_percentage}% off` +
        ` | min ₹${data.minimum_order}` +
        ` | ${data.start_date} → ${data.end_date}` +
        ` | active=${data.is_active}`,
    )
  }

  const { data: after } = await admin
    .from('offers')
    .select(
      'coupon_code,discount_percentage,minimum_order,start_date,end_date,is_active,title',
    )
    .not('coupon_code', 'is', null)
    .order('coupon_code', { ascending: true })

  console.log('\n--- Coupons in database ---')
  for (const row of after ?? []) {
    console.log(
      `${row.coupon_code}\t${row.discount_percentage}%\tmin ₹${row.minimum_order}\tactive=${row.is_active}\t${row.title}`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
