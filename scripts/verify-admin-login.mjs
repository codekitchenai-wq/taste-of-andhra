/**
 * Verify admin login end-to-end the same way the app does.
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

const client = createClient(fileEnv.VITE_SUPABASE_URL, fileEnv.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const email = 'demoadmin@tasteofandhra.test'
const password = 'Test@123'

const { data: login, error: loginErr } = await client.auth.signInWithPassword({
  email,
  password,
})
if (loginErr) {
  console.error('LOGIN_FAIL', loginErr.message)
  process.exit(1)
}
console.log('signIn ok', login.user.id)

const { data: prof, error: pe } = await client
  .from('profiles')
  .select('id,email,role,is_active')
  .eq('id', login.user.id)
  .maybeSingle()

if (pe) {
  console.error('PROFILE_ERR', pe.message)
  process.exit(1)
}
if (!prof) {
  console.error('PROFILE_MISSING')
  process.exit(1)
}

console.log('PROFILE_OK', prof)
console.log(`Ready: ${email} / ${password}`)
