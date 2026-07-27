/**
 * Create/update platform Superuser.
 * Auth signup metadata uses role=admin so the profile trigger cannot fail
 * before platform_master exists on user_role. Then profile is upgraded.
 *
 * If profile upgrade fails, run in Supabase SQL:
 *   ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'platform_master';
 * and re-run this script.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const PASSWORD = 'Test@123'
const ACCOUNT = {
  email: 'master@tasteofandhra.test',
  fullName: 'Platform Superuser',
  phone: '9000000099',
  role: 'platform_master',
}

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

const root = resolve(import.meta.dirname, '..')
const fileEnv = {
  ...loadEnvFile(resolve(root, '.env')),
  ...loadEnvFile(resolve(root, '.env.local')),
}
const url = fileEnv.VITE_SUPABASE_URL
const key = fileEnv.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

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

const existing = await findUserByEmail(ACCOUNT.email)
let userId = existing?.id

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: ACCOUNT.fullName,
      role: ACCOUNT.role,
      phone: ACCOUNT.phone,
    },
    app_metadata: { role: ACCOUNT.role },
  })
  if (error) {
    console.error('update auth error:', error)
    process.exit(1)
  }
  console.log('UPDATED auth user', existing.id)
} else {
  // Use admin in metadata so handle_new_user trigger does not fail when
  // platform_master enum value is missing.
  const { data, error } = await admin.auth.admin.createUser({
    email: ACCOUNT.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: ACCOUNT.fullName,
      role: 'admin',
      phone: ACCOUNT.phone,
    },
    app_metadata: { role: ACCOUNT.role },
  })
  if (error) {
    console.error('create auth error:', error)
    process.exit(1)
  }
  userId = data.user.id
  console.log('CREATED auth user', userId)

  await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      full_name: ACCOUNT.fullName,
      role: ACCOUNT.role,
      phone: ACCOUNT.phone,
    },
    app_metadata: { role: ACCOUNT.role },
  })
}

const { error: profileError } = await admin.from('profiles').upsert(
  {
    id: userId,
    full_name: ACCOUNT.fullName,
    email: ACCOUNT.email,
    phone: ACCOUNT.phone,
    role: ACCOUNT.role,
    is_active: true,
  },
  { onConflict: 'id' },
)

if (profileError) {
  console.error('profile error:', profileError.message)
  console.error(`
Run this in Supabase SQL Editor, then re-run: node scripts/seed-superuser.mjs

  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'platform_master';
`)
  process.exit(1)
}

console.log('OK Superuser ready:', ACCOUNT.email, '/', PASSWORD)
process.exit(0)
