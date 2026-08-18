/**
 * Seeds Spice Malabar tenant (Chopsticks Spice Malabar, Viman Nagar, Pune).
 *
 * Admin:    spice-malabar@admin.test / Test@123
 * Customer: demo@spicemalabar.test / Test@123
 *
 * Usage:
 *   node scripts/scrape-spice-malabar-menu.mjs
 *   node scripts/seed-spice-malabar.mjs
 *
 * Requires: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const STARTER_PLAN_ID = 'b0000000-0000-4000-8000-000000000001'
const GROWTH_PLAN_ID = 'b0000000-0000-4000-8000-000000000002'
const PASSWORD = 'Test@123'
const SLUG = 'chopsticksspicemalabar'
const LEGACY_SLUGS = ['spice-malabar']
const ORG_NAME = 'Chopstick Spice Malabar'
const MENU_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'data/spice-malabar-menu.json',
)

const ADMIN = {
  email: 'spice-malabar@admin.test',
  password: PASSWORD,
  fullName: 'Spice Malabar Admin',
  phone: '7841800101',
  role: 'admin',
}

/** Previous seed email — kept so existing testers still work. */
const LEGACY_ADMIN = {
  email: 'spicemalabaradmin@spicemalabar.test',
  password: PASSWORD,
  fullName: 'Spice Malabar Admin (legacy)',
  phone: '7841800101',
  role: 'admin',
}

const CUSTOMER = {
  email: 'demo@spicemalabar.test',
  password: PASSWORD,
  fullName: 'Spice Malabar Demo Customer',
  phone: '7841800102',
  role: 'customer',
}

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

/** Swiggy omits photos on many variants — reuse a sibling or similar dish photo. */
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

function loadMenu() {
  if (!existsSync(MENU_PATH)) {
    throw new Error(
      `Missing ${MENU_PATH}. Run: node scripts/scrape-spice-malabar-menu.mjs`,
    )
  }
  return JSON.parse(readFileSync(MENU_PATH, 'utf8'))
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

async function ensureAuthUser(account) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (listed.error) throw new Error(listed.error.message)

  const existing = (listed.data?.users ?? []).find(
    (user) => user.email?.toLowerCase() === account.email.toLowerCase(),
  )

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
      user_metadata: {
        full_name: account.fullName,
        role: account.role,
        phone: account.phone,
      },
    })
    if (error) throw new Error(`updateUser ${account.email}: ${error.message}`)
    return { id: existing.id, created: false }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: {
      full_name: account.fullName,
      role: account.role,
      phone: account.phone,
    },
  })
  if (error) throw new Error(`createUser ${account.email}: ${error.message}`)
  return { id: data.user.id, created: true }
}

async function upsertProfile(userId, account) {
  const { error } = await admin.from('profiles').upsert(
    {
      id: userId,
      email: account.email,
      full_name: account.fullName,
      phone: account.phone,
      role: account.role,
      is_active: true,
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(`profile ${account.email}: ${error.message}`)
}

async function upsertSetting(orgId, key, value) {
  const { error } = await admin.from('app_settings').upsert(
    {
      organization_id: orgId,
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,key' },
  )
  if (error) {
    console.warn(`app_settings ${key}: ${error.message}`)
  }
}

async function main() {
  const menu = loadMenu()
  const tenant = menu.tenant || {}
  console.log('Seeding Spice Malabar…')

  let orgId
  const { data: existingRows, error: orgFindError } = await admin
    .from('organizations')
    .select('id, name, slug, status')
    .in('slug', [SLUG, ...LEGACY_SLUGS])

  if (orgFindError) throw new Error(orgFindError.message)
  const existingOrg =
    existingRows?.find((row) => row.slug === SLUG) || existingRows?.[0]

  const homepageUrl = `https://${SLUG}.directapp.in`
  const orgFields = {
    name: ORG_NAME,
    status: 'active',
    phone: tenant.primary_phone || '+91 78418 22215',
    email: ADMIN.email,
    address:
      tenant.address ||
      'Shop No 1, Gulmohar Regency, Symbiosis College Road, Viman Nagar, Pune 411014',
    tagline: (tenant.cuisines || []).join(' · ') || 'Kerala & Malabar kitchen',
    description:
      'Chopsticks Spice Malabar — Kerala, South Indian, North Indian and Indo-Chinese in Viman Nagar, Pune.',
    fssai_license: tenant.fssai || null,
    branding: {
      logo_url: tenant.logo_url || null,
      primary_color: '#9A3412',
      hero_url: '/images/tenants/spice-malabar-hero.png',
    },
    opening_hours: tenant.hours || {
      weekdays: '07:00-23:30',
      weekends: '07:00-23:30',
    },
    settings: {
      onboarded_by: 'seed-spice-malabar',
      owner_name: ADMIN.fullName,
      owner_phone: ADMIN.phone,
      legal_name: tenant.legal_name || 'Chopsticks Spice Malabar',
      alternate_phone: tenant.alternate_phone || '+91 98900 82699',
      cuisines: tenant.cuisines || [
        'Kerala',
        'South Indian',
        'North Indian',
        'Indo-Chinese',
      ],
      locality: tenant.locality || 'Viman Nagar',
      city: tenant.city || 'Pune',
      storefront_whatsapp_enabled: false,
      homepage: {
        mode: 'platform_subdomain',
        custom_domain: null,
        homepage_url: homepageUrl,
      },
      setup: {
        address_line_1: 'Shop No 1, Gulmohar Regency',
        address_line_2: 'Symbiosis College Road',
        landmark: 'Near Datta Mandir Chowk',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: tenant.pincode || '411014',
      },
    },
  }

  const homepageColumns = {
    homepage_mode: 'platform_subdomain',
    homepage_url: homepageUrl,
    custom_domain: null,
  }

  async function saveOrganization(payload, existingId) {
    if (existingId) {
      const first = await admin.from('organizations').update(payload).eq('id', existingId)
      if (!first.error) return
      if (!/homepage_mode|custom_domain|homepage_url/.test(first.error.message)) {
        throw new Error(`org update: ${first.error.message}`)
      }
      const rest = { ...payload }
      delete rest.homepage_mode
      delete rest.custom_domain
      delete rest.homepage_url
      const retry = await admin.from('organizations').update(rest).eq('id', existingId)
      if (retry.error) throw new Error(`org update: ${retry.error.message}`)
      return
    }
    const first = await admin.from('organizations').insert(payload)
    if (!first.error) return
    if (!/homepage_mode|custom_domain|homepage_url/.test(first.error.message)) {
      throw new Error(`org insert: ${first.error.message}`)
    }
    const rest = { ...payload }
    delete rest.homepage_mode
    delete rest.custom_domain
    delete rest.homepage_url
    const retry = await admin.from('organizations').insert(rest)
    if (retry.error) throw new Error(`org insert: ${retry.error.message}`)
  }

  if (existingOrg?.id) {
    orgId = existingOrg.id
    console.log(`Org exists: ${orgId}`)
    await saveOrganization({ slug: SLUG, ...orgFields, ...homepageColumns }, orgId)
  } else {
    orgId = randomUUID()
    await saveOrganization(
      { id: orgId, slug: SLUG, ...orgFields, ...homepageColumns },
      null,
    )
    console.log(`Org created: ${orgId}`)
  }

  const periodEnd = new Date()
  periodEnd.setFullYear(periodEnd.getFullYear() + 1)

  const { data: plans, error: planError } = await admin
    .from('plans')
    .select('id, code, is_active')
    .eq('is_active', true)

  if (planError) throw new Error(`plans: ${planError.message}`)
  const planId =
    plans?.find((plan) => plan.id === GROWTH_PLAN_ID)?.id ||
    plans?.find((plan) => plan.code === 'growth')?.id ||
    plans?.find((plan) => plan.id === STARTER_PLAN_ID)?.id ||
    plans?.find((plan) => plan.code === 'starter')?.id ||
    plans?.[0]?.id
  if (!planId) throw new Error('No active subscription plan found.')
  console.log(`Plan: ${planId}`)

  const { data: sub } = await admin
    .from('subscriptions')
    .select('id')
    .eq('organization_id', orgId)
    .in('status', ['trialing', 'active', 'past_due'])
    .maybeSingle()

  if (sub?.id) {
    await admin
      .from('subscriptions')
      .update({
        plan_id: planId,
        status: 'active',
        current_period_end: periodEnd.toISOString(),
        provider: 'manual',
        provider_ref: 'seed-spice-malabar',
      })
      .eq('id', sub.id)
  } else {
    const { error } = await admin.from('subscriptions').insert({
      organization_id: orgId,
      plan_id: planId,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      provider: 'manual',
      provider_ref: 'seed-spice-malabar',
    })
    if (error) throw new Error(`subscription: ${error.message}`)
  }

  const { data: featureRows } = await admin.from('features').select('key')
  const knownFeatures = new Set((featureRows ?? []).map((row) => row.key))
  const entitlementRows = [
    {
      organization_id: orgId,
      feature_key: 'payments_direct_upi',
      enabled: true,
      source: 'manual',
      notes: 'Spice Malabar seed — Direct UPI checkout',
    },
    {
      organization_id: orgId,
      feature_key: 'payments_razorpay',
      enabled: false,
      source: 'manual',
      notes: 'Direct UPI until Razorpay is connected',
    },
    {
      organization_id: orgId,
      feature_key: 'delivery_own',
      enabled: true,
      source: 'manual',
      notes: 'Viman Nagar own delivery',
    },
    {
      organization_id: orgId,
      feature_key: 'whatsapp_notifications',
      enabled: false,
      source: 'manual',
      notes: 'WhatsApp off until restaurant admin enables storefront WhatsApp',
    },
    {
      organization_id: orgId,
      feature_key: 'whatsapp_ordering',
      enabled: false,
      source: 'manual',
      notes: 'WhatsApp off until restaurant admin enables storefront WhatsApp',
    },
  ].filter((row) => knownFeatures.has(row.feature_key))
  if (entitlementRows.length) {
    const entitlements = await admin
      .from('organization_entitlements')
      .upsert(entitlementRows, { onConflict: 'organization_id,feature_key' })
    if (entitlements.error) {
      console.warn(`entitlements: ${entitlements.error.message}`)
    }
  }

  await upsertSetting(orgId, 'upi_vpa', 'spicemalabar@upi')
  await upsertSetting(orgId, 'upi_payee_name', ORG_NAME)
  await upsertSetting(
    orgId,
    'default_eta_minutes',
    String(tenant.eta_minutes || 20),
  )

  const { data: existingDelivery } = await admin
    .from('delivery_settings')
    .select('id')
    .eq('organization_id', orgId)
    .is('branch_id', null)
    .maybeSingle()

  const deliveryPayload = {
    organization_id: orgId,
    branch_id: null,
    provider: 'own',
    is_enabled: true,
    service_pincodes: ['411014', '411006', '411001', '411032'],
    max_distance_km: 8,
    require_location_pin: false,
    fallback_charge: 49,
    per_km_charge: 0,
    free_delivery_threshold: 399,
  }

  async function saveDelivery(payload) {
    if (existingDelivery?.id) {
      return admin.from('delivery_settings').update(payload).eq('id', existingDelivery.id)
    }
    return admin.from('delivery_settings').insert(payload)
  }

  let deliveryResult = await saveDelivery(deliveryPayload)
  if (deliveryResult.error && /per_km_charge/.test(deliveryResult.error.message)) {
    const { per_km_charge, ...withoutPerKm } = deliveryPayload
    deliveryResult = await saveDelivery(withoutPerKm)
  }
  if (deliveryResult.error) {
    console.warn(`delivery_settings: ${deliveryResult.error.message}`)
  }

  const { data: oldDishes } = await admin
    .from('dishes')
    .select('id')
    .eq('organization_id', orgId)
  if (oldDishes?.length) {
    await admin.from('dishes').delete().eq('organization_id', orgId)
  }

  const categories = Array.isArray(menu.categories) ? menu.categories : []
  const filledImages = fillMissingMenuImages(categories)
  if (filledImages) {
    console.log(`Filled ${filledImages} dish photos from sibling/category images`)
  }
  const categoryIds = new Map()

  for (const [index, category] of categories.entries()) {
    const categoryName = String(category.category_name || '').trim()
    if (!categoryName) continue
    const imageUrl =
      category.items?.find((item) => item.image_url)?.image_url || null
    const slug = slugify(`${categoryName}-${SLUG}-${index + 1}`)
    const { data: existingCat } = await admin
      .from('categories')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', categoryName)
      .maybeSingle()

    if (existingCat?.id) {
      categoryIds.set(categoryName, existingCat.id)
      await admin
        .from('categories')
        .update({
          is_active: true,
          display_order: index + 1,
          image_url: imageUrl,
          slug,
        })
        .eq('id', existingCat.id)
      continue
    }

    const { data, error } = await admin
      .from('categories')
      .insert({
        organization_id: orgId,
        name: categoryName,
        slug,
        description: categoryName,
        image_url: imageUrl,
        display_order: index + 1,
        is_active: true,
      })
      .select('id')
      .single()
    if (error) throw new Error(`category ${categoryName}: ${error.message}`)
    categoryIds.set(categoryName, data.id)
  }

  const dishRows = []
  let dishIndex = 0
  for (const category of categories) {
    const categoryName = String(category.category_name || '').trim()
    const categoryId = categoryIds.get(categoryName)
    if (!categoryId) continue
    for (const item of category.items || []) {
      dishIndex += 1
      const name = String(item.name || '').trim()
      if (!name || !item.price || item.price <= 0) continue
      dishRows.push({
        organization_id: orgId,
        category_id: categoryId,
        name,
        slug: slugify(`${name}-${SLUG}-${dishIndex}`),
        description: item.description || null,
        price: item.price,
        is_veg: Boolean(item.is_veg),
        spice_level: item.spice_level || 'medium',
        preparation_time: item.preparation_time || 25,
        image_url: item.image_url || null,
        is_available: true,
        is_featured: Boolean(item.is_featured),
        rating: tenant.avg_rating || null,
      })
    }
  }

  const chunkSize = 80
  for (let i = 0; i < dishRows.length; i += chunkSize) {
    const chunk = dishRows.slice(i, i + chunkSize)
    const { error } = await admin.from('dishes').insert(chunk)
    if (error) {
      throw new Error(`dishes ${i}-${i + chunk.length}: ${error.message}`)
    }
  }

  for (const account of [ADMIN, LEGACY_ADMIN]) {
    const adminUser = await ensureAuthUser(account)
    await upsertProfile(adminUser.id, account)
    const { error: memberError } = await admin.from('organization_members').upsert(
      {
        organization_id: orgId,
        user_id: adminUser.id,
        role: 'restaurant_owner',
        is_active: true,
      },
      { onConflict: 'organization_id,user_id' },
    )
    if (memberError) {
      throw new Error(`org member ${account.email}: ${memberError.message}`)
    }
  }

  const customerUser = await ensureAuthUser(CUSTOMER)
  await upsertProfile(customerUser.id, CUSTOMER)

  console.log('')
  console.log('Ready — Spice Malabar')
  console.log(`  Organization id: ${orgId}`)
  console.log(`  Slug:            ${SLUG}`)
  console.log(`  Menu dishes:     ${dishRows.length}`)
  console.log(`  Categories:      ${categoryIds.size}`)
  console.log(`  Storefront:      ${homepageUrl}`)
  console.log('  UPI VPA:         spicemalabar@upi (change in Admin → Settings)')
  console.log('')
  console.log('Admin login')
  console.log(`  Email:    ${ADMIN.email}`)
  console.log(`  Password: ${PASSWORD}`)
  console.log('  URL:      /admin/login')
  console.log('')
  console.log('Customer demo login')
  console.log(`  Email:    ${CUSTOMER.email}`)
  console.log(`  Password: ${PASSWORD}`)
  console.log('  URL:      /login')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
