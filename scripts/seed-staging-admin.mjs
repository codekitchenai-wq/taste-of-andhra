/**
 * One-off staging admin bootstrap (reads .env.local).
 * Email: admin@staging.local / Test@123
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const env = {}
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

const root = resolve(import.meta.dirname, '..')
const fileEnv = loadEnvFile(resolve(root, '.env.local'))
const url = fileEnv.VITE_SUPABASE_URL
const serviceKey = fileEnv.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const email = 'admin@staging.local'
const password = 'Test@123'
const orgId = 'a0000000-0000-4000-8000-000000000001'

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: 'Staging Admin', role: 'admin', phone: '9876543211' },
})
if (error) {
  console.error('createUser failed:', error.message)
  process.exit(1)
}

const uid = data.user.id
const { error: profileErr } = await admin
  .from('profiles')
  .upsert({
    id: uid,
    email,
    full_name: 'Staging Admin',
    phone: '9876543211',
    role: 'admin',
    is_active: true,
  })
if (profileErr) console.warn('profile upsert:', profileErr.message)

const { error: memberErr } = await admin.from('organization_members').upsert(
  {
    organization_id: orgId,
    user_id: uid,
    role: 'restaurant_owner',
    is_active: true,
  },
  { onConflict: 'organization_id,user_id' },
)
if (memberErr) console.warn('org member upsert:', memberErr.message)

console.log(`Ready: ${email} / ${password}`)
console.log(`user id: ${uid}`)
