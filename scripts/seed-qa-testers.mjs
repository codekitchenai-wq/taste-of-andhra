/**
 * Seeds all QA / demo personas via Supabase Admin API (service role).
 * Shared password: Test@123
 *
 * Includes:
 *   - DirectApp Master (platform_master)
 *   - Demo customer / admin / delivery
 *   - Tester 1 + Tester 2 customer / admin / delivery
 *
 * Add to .env.local:
 *   VITE_SUPABASE_URL=...
 *   VITE_SUPABASE_ANON_KEY=...
 *   SUPABASE_SERVICE_ROLE_KEY=...   (Project Settings → API → service_role)
 *
 * Requires profiles.role enum to include platform_master
 * (from migration 20260727120000_saas_multi_tenant_model.sql).
 * If DirectApp Master seed fails on role, run:
 *   ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'platform_master';
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const PASSWORD = 'Test@123'

const ACCOUNTS = [
  {
    email: 'master@tasteofandhra.test',
    fullName: 'DirectApp Master',
    phone: '9000000099',
    role: 'platform_master',
  },
  {
    email: 'customer@tasteofandhra.test',
    fullName: 'Demo Customer',
    phone: '9876543210',
    role: 'customer',
  },
  {
    email: 'admin@tasteofandhra.test',
    fullName: 'Demo Admin',
    phone: '9876543211',
    role: 'admin',
  },
  {
    email: 'delivery@tasteofandhra.test',
    fullName: 'Demo Delivery',
    phone: '9876543212',
    role: 'delivery',
  },
  {
    email: 'tester1.customer@thetasteofandhra.com',
    fullName: 'Tester 1 Customer',
    phone: '9000000001',
    role: 'customer',
  },
  {
    email: 'tester1.admin@thetasteofandhra.com',
    fullName: 'Tester 1 Admin',
    phone: '9000000011',
    role: 'admin',
  },
  {
    email: 'tester1.delivery@thetasteofandhra.com',
    fullName: 'Tester 1 Delivery',
    phone: '9000000021',
    role: 'delivery',
  },
  {
    email: 'tester2.customer@thetasteofandhra.com',
    fullName: 'Tester 2 Customer',
    phone: '9000000002',
    role: 'customer',
  },
  {
    email: 'tester2.admin@thetasteofandhra.com',
    fullName: 'Tester 2 Admin',
    phone: '9000000012',
    role: 'admin',
  },
  {
    email: 'tester2.delivery@thetasteofandhra.com',
    fullName: 'Tester 2 Delivery',
    phone: '9000000022',
    role: 'delivery',
  },
]

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
const anonKey =
  process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  fileEnv.VITE_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL in .env.local')
  process.exit(1)
}

if (!serviceRoleKey) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY in .env.local\n' +
      'Get it from: Supabase Dashboard → Project Settings → API → service_role (secret)\n' +
      'Add: SUPABASE_SERVICE_ROLE_KEY=eyJ...',
  )
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const client = anonKey
  ? createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

async function findUserByEmail(email) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) throw error
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    )
    if (found) return found
    if (data.users.length < 200) break
  }
  return null
}

async function upsertProfile(userId, account) {
  const { error } = await admin.from('profiles').upsert(
    {
      id: userId,
      full_name: account.fullName,
      email: account.email,
      phone: account.phone,
      role: account.role,
      is_active: true,
    },
    { onConflict: 'id' },
  )

  if (error) {
    console.error(`PROFILE_ERR ${account.email}: ${error.message}`)
    if (
      account.role === 'platform_master' &&
      error.message.toLowerCase().includes('platform_master')
    ) {
      console.error(
        '  → Run: ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS \'platform_master\';',
      )
    }
    return false
  }

  return true
}

async function upsertAccount(account) {
  const existing = await findUserByEmail(account.email)
  const bootstrapRole =
    account.role === 'platform_master' ? 'admin' : account.role

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: account.fullName,
        role: account.role,
        phone: account.phone,
      },
      app_metadata: {
        role: account.role,
      },
    })
    if (error) {
      console.error(`UPDATE_ERR ${account.email}: ${error.message || error}`)
      return false
    }

    const profileOk = await upsertProfile(existing.id, account)
    if (!profileOk) return false

    console.log(`UPDATED ${account.role.padEnd(16)} ${account.email}`)
    return true
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: account.fullName,
      // Avoid trigger failure when platform_master enum is not applied yet.
      role: bootstrapRole,
      phone: account.phone,
    },
    app_metadata: {
      role: account.role,
    },
  })

  if (error) {
    console.error(`CREATE_ERR ${account.email}: ${error.message || error}`)
    return false
  }

  if (data.user) {
    if (account.role === 'platform_master') {
      await admin.auth.admin.updateUserById(data.user.id, {
        user_metadata: {
          full_name: account.fullName,
          role: account.role,
          phone: account.phone,
        },
        app_metadata: { role: account.role },
      })
    }

    const profileOk = await upsertProfile(data.user.id, account)
    if (!profileOk) return false
  }

  console.log(`CREATED ${account.role.padEnd(16)} ${account.email}`)
  return true
}

async function verifyLogin(account) {
  if (!client) {
    console.warn(`SKIP_LOGIN_CHECK ${account.email} (no anon key)`)
    return true
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: account.email,
    password: PASSWORD,
  })

  if (error) {
    console.error(`LOGIN_FAIL ${account.email}: ${error.message}`)
    return false
  }

  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  console.log(
    `LOGIN_OK ${account.email} profile=${profile?.role ?? 'missing'}`,
  )
  await client.auth.signOut()
  return true
}

console.log(`Seeding ${ACCOUNTS.length} QA accounts (password ${PASSWORD})...\n`)

let seedOk = true
for (const account of ACCOUNTS) {
  const ok = await upsertAccount(account)
  if (!ok) seedOk = false
}

console.log('\nVerifying password logins...\n')

let loginOk = true
for (const account of ACCOUNTS) {
  const ok = await verifyLogin(account)
  if (!ok) loginOk = false
}

console.log('\n--- Tester quick list ---')
for (const account of ACCOUNTS) {
  console.log(`  ${account.role.padEnd(16)} ${account.email} / ${PASSWORD}`)
}

if (seedOk && loginOk) {
  console.log(`\nALL_OK — ${ACCOUNTS.length} accounts ready with password ${PASSWORD}`)
  console.log('See docs/TESTER_LOGIN_REFERENCE.md for portals and links.')
  process.exit(0)
}

console.log('\nFAILED — see errors above')
process.exit(1)
