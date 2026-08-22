/**
 * Set Chopsticks Spice Malabar Google Business Profile ref on organizations.settings.
 *
 * Staging:  node scripts/set-chopsticks-google-place-id.mjs
 * Production:
 *   node scripts/seed-production.mjs set-chopsticks-google-place-id.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const SLUGS = ['chopsticksspicemalabar', 'spice-malabar']
const PLACE_REF = '0x3bc2c147612d2283:0x99931da5ee69218a'

function loadEnvFile() {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../.env.local')
  if (!existsSync(envPath)) return {}
  const out = {}
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).trim()
  }
  return out
}

const fileEnv = loadEnvFile()
const url =
  process.env.VITE_SUPABASE_URL?.trim() || fileEnv.VITE_SUPABASE_URL?.trim()
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  fileEnv.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const host = new URL(url).host
console.log(`Updating Chopsticks Google place on ${host}…`)

const { data: orgs, error: orgError } = await admin
  .from('organizations')
  .select('id, slug, name, settings')
  .in('slug', SLUGS)

if (orgError) {
  console.error(orgError.message)
  process.exit(1)
}

if (!orgs?.length) {
  console.error(`Organization not found for slugs: ${SLUGS.join(', ')}`)
  process.exit(1)
}

for (const org of orgs) {
  const settings =
    org.settings && typeof org.settings === 'object' ? { ...org.settings } : {}

  settings.google_place_id = PLACE_REF
  settings.google_reviews_widget_src = settings.google_reviews_widget_src || ''
  settings.google_reviews_widget_class =
    settings.google_reviews_widget_class || ''

  const { data: updated, error: updateError } = await admin
    .from('organizations')
    .update({ settings })
    .eq('id', org.id)
    .select('id, slug, name, settings')
    .maybeSingle()

  if (updateError || !updated) {
    console.error(updateError?.message || `Update failed for ${org.slug}`)
    process.exit(1)
  }

  const saved =
    updated.settings && typeof updated.settings === 'object'
      ? updated.settings.google_place_id
      : null

  console.log(`Updated ${updated.slug} (${updated.name})`)
  console.log(`google_place_id → ${saved}`)
}