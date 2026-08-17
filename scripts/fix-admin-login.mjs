/**
 * One-off: delete/recreate admin@tasteofandhra.test with password Test@123
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const EMAIL = 'admin@tasteofandhra.test'
const PASSWORD = 'Test@123'
const ACCOUNT = {
  email: EMAIL,
  fullName: 'Demo Admin',
  phone: '9876543211',
  role: 'admin',
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const env = {}
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

const supabaseUrl = fileEnv.VITE_SUPABASE_URL?.trim()
const serviceRoleKey = fileEnv.SUPABASE_SERVICE_ROLE_KEY?.trim()
const anonKey = fileEnv.VITE_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const client = createClient(supabaseUrl, anonKey, {
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

const existing = await findUserByEmail(EMAIL)
console.log(
  'EXISTING',
  existing
    ? { id: existing.id, confirmed: Boolean(existing.email_confirmed_at) }
    : null,
)

if (existing) {
  const { error: delErr } = await admin.auth.admin.deleteUser(existing.id)
  console.log('DELETE', delErr ? delErr.message || delErr : 'ok')
  // profiles should cascade; clean leftover by email/phone if needed
  await admin.from('profiles').delete().eq('id', existing.id)
}

const { data: phoneRows } = await admin
  .from('profiles')
  .select('id,email,phone')
  .eq('phone', ACCOUNT.phone)
console.log('PHONE_ROWS', phoneRows)

if (phoneRows?.length) {
  for (const row of phoneRows) {
    await admin.from('profiles').update({ phone: null }).eq('id', row.id)
    console.log('CLEARED_PHONE', row.email || row.id)
  }
}

const { data, error } = await admin.auth.admin.createUser({
  email: EMAIL,
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
  console.error('CREATE_ERR', JSON.stringify(error, null, 2))
  process.exit(1)
}

console.log('CREATED', data.user?.id)

const { error: profileErr } = await admin.from('profiles').upsert(
  {
    id: data.user.id,
    full_name: ACCOUNT.fullName,
    email: ACCOUNT.email,
    phone: ACCOUNT.phone,
    role: ACCOUNT.role,
    is_active: true,
  },
  { onConflict: 'id' },
)
if (profileErr) {
  console.error('PROFILE_ERR', profileErr.message)
  process.exit(1)
}

const { data: login, error: loginErr } = await client.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
})
if (loginErr) {
  console.error('LOGIN_FAIL', loginErr.message)
  process.exit(1)
}

const { data: profile } = await client
  .from('profiles')
  .select('role,email')
  .eq('id', login.user.id)
  .maybeSingle()

console.log('LOGIN_OK', profile)
await client.auth.signOut()
console.log(`Ready: ${EMAIL} / ${PASSWORD}`)
