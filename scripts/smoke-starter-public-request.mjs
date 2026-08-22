/**
 * Smoke-test public Website Starter request against the linked Supabase project.
 * Usage: node scripts/smoke-starter-public-request.mjs
 * Reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from .env.local (no secrets printed).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) throw new Error('Missing .env.local')
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 0) continue
    const key = trimmed.slice(0, i).trim()
    let value = trimmed.slice(i + 1).trim()
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

const env = loadEnvLocal()
const url = env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const anon = env.VITE_SUPABASE_ANON_KEY
if (!url || !anon) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY required')

const stamp = Date.now().toString().slice(-8)
const fssaiLicense = `TESTPUB${stamp}99`.toUpperCase()
const body = {
  restaurantName: `Smoke Starter ${stamp}`,
  ownerName: 'Smoke Tester',
  ownerPhone: '9876500001',
  ownerEmail: `smoke-starter-${stamp}@example.com`,
  fssaiLicense,
  city: 'Pune',
  appOrigin: 'https://www.directapp.in',
}

console.log('Invoking starter-public-request…')
console.log('FSSAI:', fssaiLicense)

const res = await fetch(`${url}/functions/v1/starter-public-request`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${anon}`,
    apikey: anon,
  },
  body: JSON.stringify(body),
})

const json = await res.json().catch(() => ({}))
console.log('HTTP', res.status)
if (!res.ok) {
  console.error('Error payload:', json)
  process.exit(1)
}

const required = ['setupUrl', 'whatsappMessage', 'organizationId', 'slug']
for (const key of required) {
  if (!json[key]) {
    console.error(`Missing ${key}`)
    process.exit(1)
  }
}

console.log('OK created org', json.slug)
console.log('setupUrl', json.setupUrl)
console.log('resumed', Boolean(json.resumed))

console.log('Re-submitting same FSSAI (expect resume)…')
const res2 = await fetch(`${url}/functions/v1/starter-public-request`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${anon}`,
    apikey: anon,
  },
  body: JSON.stringify(body),
})
const json2 = await res2.json().catch(() => ({}))
console.log('HTTP', res2.status)
if (!res2.ok) {
  console.error('Resume failed:', json2)
  process.exit(1)
}
if (!json2.resumed) {
  console.error('Expected resumed=true on duplicate open application')
  process.exit(1)
}
console.log('OK resumed setupUrl', json2.setupUrl)
console.log('Smoke test passed.')
