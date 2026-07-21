/**
 * Seeds one email/password demo user per persona (customer, admin, delivery).
 * Password for all: 123456
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
 * and "Confirm email" disabled under Supabase Auth → Providers → Email.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const DEMO_PASSWORD = '123456'

const DEMO_ACCOUNTS = [
  {
    email: 'customer@tasteofandhra.test',
    password: DEMO_PASSWORD,
    fullName: 'Demo Customer',
    phone: '9876543210',
    role: 'customer',
  },
  {
    email: 'admin@tasteofandhra.test',
    password: DEMO_PASSWORD,
    fullName: 'Demo Admin',
    phone: '9876543211',
    role: 'admin',
  },
  {
    email: 'delivery@tasteofandhra.test',
    password: DEMO_PASSWORD,
    fullName: 'Demo Delivery',
    phone: '9876543212',
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
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  fileEnv.VITE_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to .env.local first.',
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

async function seedAccount(account) {
  const { data, error } = await supabase.auth.signUp({
    email: account.email,
    password: account.password,
    options: {
      data: {
        full_name: account.fullName,
        role: account.role,
        phone: account.phone,
      },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      console.log(`✓ ${account.role}: already exists (${account.email})`)
      return
    }

    console.error(`✗ ${account.role}: ${error.message}`)
    return
  }

  if (!data.session) {
    console.warn(
      `! ${account.role}: created ${account.email}, but no session — disable "Confirm email" in Supabase Auth settings, then sign in with password ${DEMO_PASSWORD}`,
    )
    return
  }

  console.log(`✓ ${account.role}: ready (${account.email} / ${DEMO_PASSWORD})`)
  await supabase.auth.signOut()
}

console.log('Seeding demo users...\n')

for (const account of DEMO_ACCOUNTS) {
  await seedAccount(account)
}

console.log('\nDone. Use these on the login screens:')
for (const account of DEMO_ACCOUNTS) {
  console.log(`  ${account.role.padEnd(10)} ${account.email} / ${DEMO_PASSWORD}`)
}
