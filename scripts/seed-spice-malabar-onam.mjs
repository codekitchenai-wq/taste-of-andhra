/**
 * Upsert Onam Sadhya dine-in / parcel dishes for Spice Malabar.
 * Does not wipe the rest of the menu.
 *
 *   node scripts/seed-spice-malabar-onam.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SLUGS = ['chopsticksspicemalabar', 'spice-malabar']
const IMAGE_URL = '/images/tenants/spice-malabar-onam.png'
const DESCRIPTION =
  'Traditional Kerala Onam Sadhya on banana leaf. 28 items including avial, olan, sambar, rasam, payasam. Pre-book for 25–26 August, 11 AM–9 PM.'

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

const { data: org, error: orgError } = await admin
  .from('organizations')
  .select('id')
  .in('slug', SLUGS)
  .limit(1)
  .maybeSingle()

if (orgError || !org?.id) {
  console.error(orgError?.message || 'Spice Malabar organization not found')
  process.exit(1)
}

const { data: existingCat } = await admin
  .from('categories')
  .select('id')
  .eq('organization_id', org.id)
  .eq('name', 'Onam Special')
  .maybeSingle()

let categoryId = existingCat?.id
if (categoryId) {
  await admin
    .from('categories')
    .update({
      is_active: true,
      display_order: 0,
      image_url: IMAGE_URL,
      slug: 'onam-special',
      description: 'Onam Sadhya pre-booking — 25 & 26 August',
    })
    .eq('id', categoryId)
} else {
  const { data, error } = await admin
    .from('categories')
    .insert({
      organization_id: org.id,
      name: 'Onam Special',
      slug: 'onam-special',
      description: 'Onam Sadhya pre-booking — 25 & 26 August',
      image_url: IMAGE_URL,
      display_order: 0,
      is_active: true,
    })
    .select('id')
    .single()
  if (error) {
    console.error(`category: ${error.message}`)
    process.exit(1)
  }
  categoryId = data.id
}

const dishes = [
  {
    name: 'Onam Sadhya (Dine-in)',
    slug: 'onam-sadhya-dine-in',
    price: 630,
    is_featured: false,
  },
  {
    name: 'Onam Sadhya (Parcel)',
    slug: 'onam-sadhya-parcel',
    price: 720,
    is_featured: true,
  },
]

for (const dish of dishes) {
  const payload = {
    organization_id: org.id,
    category_id: categoryId,
    name: dish.name,
    slug: dish.slug,
    description: DESCRIPTION,
    price: dish.price,
    is_veg: true,
    spice_level: 'mild',
    preparation_time: 45,
    image_url: IMAGE_URL,
    is_available: true,
    is_featured: dish.is_featured,
  }

  const { data: existing } = await admin
    .from('dishes')
    .select('id')
    .eq('organization_id', org.id)
    .eq('slug', dish.slug)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await admin.from('dishes').update(payload).eq('id', existing.id)
    if (error) {
      console.error(`${dish.slug}: ${error.message}`)
      process.exit(1)
    }
    console.log(`Updated ${dish.name}`)
    continue
  }

  const { error } = await admin.from('dishes').insert(payload)
  if (error) {
    console.error(`${dish.slug}: ${error.message}`)
    process.exit(1)
  }
  console.log(`Created ${dish.name}`)
}

console.log('Onam Sadhya offer is ready')
