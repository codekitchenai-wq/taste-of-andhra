/**
 * Rename Spice Malabar storefront slug without wiping the menu.
 * spice-malabar.directapp.in → chopsticksspicemalabar.directapp.in
 *
 *   node scripts/rename-spice-malabar-slug.mjs
 *   node scripts/seed-production.mjs rename-spice-malabar-slug.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CANONICAL = 'chopsticksspicemalabar'
const LEGACY = 'spice-malabar'
const HOMEPAGE = `https://${CANONICAL}.directapp.in`

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

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fileEnv = {
  ...loadEnvFile(resolve(root, '.env')),
  ...loadEnvFile(resolve(root, '.env.local')),
}
const url = process.env.VITE_SUPABASE_URL?.trim() || fileEnv.VITE_SUPABASE_URL
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  fileEnv.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  )
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: rows, error } = await admin
  .from('organizations')
  .select('id, slug, name, settings')
  .in('slug', [CANONICAL, LEGACY])

if (error) {
  console.error(error.message)
  process.exit(1)
}

const org = rows?.find((row) => row.slug === CANONICAL) || rows?.[0]
if (!org?.id) {
  console.error('Spice Malabar organization not found')
  process.exit(1)
}

const settings =
  org.settings && typeof org.settings === 'object' ? { ...org.settings } : {}
const homepage =
  settings.homepage && typeof settings.homepage === 'object'
    ? { ...settings.homepage }
    : {}
settings.homepage = {
  ...homepage,
  mode: 'platform_subdomain',
  custom_domain: null,
  homepage_url: HOMEPAGE,
}

const payload = {
  slug: CANONICAL,
  homepage_mode: 'platform_subdomain',
  homepage_url: HOMEPAGE,
  custom_domain: null,
  settings,
}

let result = await admin.from('organizations').update(payload).eq('id', org.id)
if (result.error && /homepage_mode|custom_domain|homepage_url/.test(result.error.message)) {
  const rest = { slug: CANONICAL, settings }
  result = await admin.from('organizations').update(rest).eq('id', org.id)
}

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

console.log(`Renamed ${org.slug} → ${CANONICAL}`)
console.log(`Storefront: ${HOMEPAGE}`)
console.log(`Organization id: ${org.id}`)
