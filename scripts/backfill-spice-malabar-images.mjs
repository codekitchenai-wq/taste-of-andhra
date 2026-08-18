/**
 * Fill Spice Malabar dishes that Swiggy listed without a photo.
 * Reuses a same-name, similar-name, or category photo — never Andhra assets.
 *
 *   node scripts/backfill-spice-malabar-images.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SLUGS = ['chopsticksspicemalabar', 'spice-malabar']
const MENU_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'data/spice-malabar-menu.json',
)

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

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

const IMAGE_STOP = new Set([
  'with',
  'and',
  'the',
  'special',
  'combo',
  'piece',
  'pcs',
  'half',
  'full',
  'veg',
  'non',
])

function nameTokens(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((word) => word.length > 2 && !IMAGE_STOP.has(word))
}

function tokenScore(left, right) {
  const rightSet = new Set(right)
  return left.filter((word) => rightSet.has(word)).length
}

function bestPhotoMatch(tokens, candidates, minScore = 1) {
  let best = null
  let bestScore = 0
  for (const other of candidates) {
    const score = tokenScore(tokens, nameTokens(other.name))
    if (score > bestScore) {
      bestScore = score
      best = other.image_url
    }
  }
  return bestScore >= minScore ? best : null
}

function fillMissingMenuImages(categories) {
  const byName = new Map()
  const allWithPhoto = []
  for (const category of categories) {
    for (const item of category.items || []) {
      if (item.image_url) {
        byName.set(slugify(item.name), item.image_url)
        allWithPhoto.push(item)
      }
    }
  }
  const vegPhoto = allWithPhoto.find((item) => item.is_veg)?.image_url
  const nonVegPhoto = allWithPhoto.find((item) => !item.is_veg)?.image_url

  let filled = 0
  for (const category of categories) {
    const items = category.items || []
    const withPhoto = items.filter((item) => item.image_url)
    const categoryPhoto = withPhoto[0]?.image_url || null

    for (const item of items) {
      if (item.image_url) continue
      const named = byName.get(slugify(item.name))
      if (named) {
        item.image_url = named
        filled += 1
        continue
      }

      const tokens = nameTokens(item.name)
      const next =
        bestPhotoMatch(tokens, withPhoto) ||
        bestPhotoMatch(tokens, allWithPhoto) ||
        categoryPhoto ||
        (item.is_veg ? vegPhoto : nonVegPhoto) ||
        allWithPhoto[0]?.image_url ||
        null
      if (next) {
        item.image_url = next
        filled += 1
      }
    }
  }
  return filled
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

const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8'))
const categories = Array.isArray(menu.categories) ? menu.categories : []
const filled = fillMissingMenuImages(categories)
writeFileSync(MENU_PATH, `${JSON.stringify(menu, null, 2)}\n`)
console.log(`Menu JSON: filled ${filled} missing photos`)

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

const byName = new Map()
for (const category of categories) {
  for (const item of category.items || []) {
    if (item.image_url) byName.set(String(item.name).trim().toLowerCase(), item.image_url)
  }
}

const { data: dishes, error: dishError } = await admin
  .from('dishes')
  .select('id, name, image_url, category_id')
  .eq('organization_id', org.id)

if (dishError) {
  console.error(dishError.message)
  process.exit(1)
}

let updated = 0
for (const dish of dishes || []) {
  if (dish.image_url) continue
  const next = byName.get(String(dish.name).trim().toLowerCase())
  if (!next) continue
  const { error } = await admin
    .from('dishes')
    .update({ image_url: next })
    .eq('id', dish.id)
  if (error) {
    console.warn(`${dish.name}: ${error.message}`)
    continue
  }
  updated += 1
}

const { data: cats, error: catError } = await admin
  .from('categories')
  .select('id, name, image_url')
  .eq('organization_id', org.id)

if (!catError) {
  for (const category of cats || []) {
    if (category.image_url) continue
    const match = categories.find(
      (row) => String(row.category_name).trim() === category.name,
    )
    const imageUrl =
      match?.items?.find((item) => item.image_url)?.image_url || null
    if (!imageUrl) continue
    await admin
      .from('categories')
      .update({ image_url: imageUrl })
      .eq('id', category.id)
  }
}

console.log(`Database: updated ${updated} dishes without photos`)
