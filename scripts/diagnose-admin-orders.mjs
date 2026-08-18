/**
 * Diagnose whatsapp-connect Edge Function failures.
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

const url = fileEnv.VITE_SUPABASE_URL
const anon = fileEnv.VITE_SUPABASE_ANON_KEY
const client = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const email = 'demoadmin@tasteofandhra.test'
const password = 'Test@123'
const orgId = 'a0000000-0000-4000-8000-000000000001'

const { data: login, error: loginErr } = await client.auth.signInWithPassword({
  email,
  password,
})
if (loginErr) {
  console.error('LOGIN_FAIL', loginErr.message)
  process.exit(1)
}
console.log('LOGIN_OK', login.user.id)

const { data, error } = await client.functions.invoke('whatsapp-connect', {
  body: {
    action: 'save_preferences',
    organizationId: orgId,
    enabledStatuses: {
      pending: false,
      confirmed: true,
      preparing: true,
      ready: true,
      out_for_delivery: true,
      delivered: true,
      cancelled: true,
    },
  },
})

console.log('DATA', JSON.stringify(data, null, 2))
console.log('ERROR_MESSAGE', error?.message)
if (error?.context) {
  try {
    const text = await error.context.text()
    console.log('ERROR_BODY', text)
  } catch (e) {
    console.log('ERROR_CONTEXT_READ_FAIL', e)
  }
}
