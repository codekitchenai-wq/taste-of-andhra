/**
 * Diagnose Pidge Edge Function configuration (status only — does not book a rider).
 *
 *   node scripts/diagnose-pidge.mjs
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

if (!url || !anon) {
  console.error('MISSING_ENV VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const client = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const email = process.env.PIDGE_DIAGNOSE_EMAIL ?? 'demoadmin@tasteofandhra.test'
const password = process.env.PIDGE_DIAGNOSE_PASSWORD ?? 'Test@123'

const { data: login, error: loginErr } = await client.auth.signInWithPassword({
  email,
  password,
})
if (loginErr) {
  console.error('LOGIN_FAIL', loginErr.message)
  process.exit(1)
}
console.log('LOGIN_OK', login.user.id)

const { data, error } = await client.functions.invoke('pidge-dispatch', {
  body: { action: 'status' },
})

console.log('DATA', JSON.stringify(data, null, 2))
console.log('ERROR_MESSAGE', error?.message ?? null)
if (error?.context) {
  try {
    const text = await error.context.text()
    console.log('ERROR_BODY', text)
  } catch (caught) {
    console.log('ERROR_CONTEXT_READ_FAIL', String(caught))
  }
}

if (error) {
  console.error('FUNCTIONS_FAIL — deploy pidge-dispatch (see docs/PIDGE_SETUP.md)')
  process.exit(1)
}

if (data?.error) {
  console.error('STATUS_ERROR', data.error)
  process.exit(1)
}

const configured = Boolean(data?.configured)
const webhookConfigured = Boolean(data?.webhookConfigured)
console.log('FUNCTIONS_OK')
console.log('PIDGE_API_TOKEN', configured ? 'set' : 'missing')
console.log('PIDGE_WEBHOOK_TOKEN', webhookConfigured ? 'set' : 'missing')
console.log('CHANNEL', data?.channelName ?? 'taste-of-andhra')
console.log(
  'WEBHOOK_URL',
  `${url.replace(/\/$/, '')}/functions/v1/pidge-webhook`,
)

if (!configured || !webhookConfigured) {
  console.error('SECRETS_MISSING — supabase secrets set PIDGE_API_TOKEN=... PIDGE_WEBHOOK_TOKEN=...')
  process.exit(1)
}

console.log('PIDGE_READY')
