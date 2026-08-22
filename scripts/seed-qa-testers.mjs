/**
 * Seeds DirectApp Master + one demo admin/customer/delivery per restaurant.
 * Shared password: Test@123
 *
 * Then deletes retired shared test users (not real customer Google accounts).
 *
 *   npm run seed:qa-testers
 *   npm run seed:qa-testers:production
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DEMO_PASSWORD,
  MASTER_EMAIL,
  MASTER_NAME,
  MASTER_PHONE,
  RETIRED_TEST_EMAILS,
  demoPersonaEmail,
  tenantDemoAccounts,
} from './lib/tenant-demo-accounts.mjs'

const MASTER = {
  email: MASTER_EMAIL,
  fullName: MASTER_NAME,
  phone: MASTER_PHONE,
  role: 'platform_master',
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {}

  const env = {}
  const content = readFileSync(filePath, 'utf8')

  for (const line of content.split(/\r?\n/)) {
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

const supabaseUrl =
  process.env.VITE_SUPABASE_URL?.trim() || fileEnv.VITE_SUPABASE_URL?.trim()
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  fileEnv.SUPABASE_SERVICE_ROLE_KEY?.trim()
const anonKey =
  process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  fileEnv.VITE_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL in .env.local')
  process.exit(1)
}

if (!serviceRoleKey) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY in .env.local\n' +
      'Get it from: Supabase Dashboard → Project Settings → API → service_role (secret)\n' +
      'Add: SUPABASE_SERVICE_ROLE_KEY=eyJ...',
  )
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const client = anonKey
  ? createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) throw error
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    )
    if (found) return found
    if (data.users.length < 200) break
  }
  return null
}

async function listAllAuthUsers() {
  const users = []
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 200) break
  }
  return users
}

async function upsertProfile(userId, account) {
  const { error } = await admin.from('profiles').upsert(
    {
      id: userId,
      full_name: account.fullName,
      email: account.email,
      phone: account.phone,
      role: account.role,
      is_active: true,
    },
    { onConflict: 'id' },
  )

  if (error) {
    console.error(`PROFILE_ERR ${account.email}: ${error.message}`)
    if (
      account.role === 'platform_master' &&
      error.message.toLowerCase().includes('platform_master')
    ) {
      console.error(
        "  → Run: ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'platform_master';",
      )
    }
    return false
  }

  return true
}

async function upsertAccount(account) {
  const existing = await findUserByEmail(account.email)
  const bootstrapRole =
    account.role === 'platform_master' ? 'admin' : account.role

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: account.fullName,
        role: account.role,
        phone: account.phone,
      },
      app_metadata: {
        role: account.role,
      },
    })
    if (error) {
      console.error(`UPDATE_ERR ${account.email}: ${error.message || error}`)
      return null
    }

    const profileOk = await upsertProfile(existing.id, account)
    if (!profileOk) return null

    console.log(`UPDATED ${account.role.padEnd(16)} ${account.email}`)
    return existing.id
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: account.fullName,
      role: bootstrapRole,
      phone: account.phone,
    },
    app_metadata: {
      role: account.role,
    },
  })

  if (error) {
    console.error(`CREATE_ERR ${account.email}: ${error.message || error}`)
    return null
  }

  if (data.user && account.role === 'platform_master') {
    await admin.auth.admin.updateUserById(data.user.id, {
      user_metadata: {
        full_name: account.fullName,
        role: account.role,
        phone: account.phone,
      },
      app_metadata: { role: account.role },
    })
  }

  if (!data.user) return null
  const profileOk = await upsertProfile(data.user.id, account)
  if (!profileOk) return null

  console.log(`CREATED ${account.role.padEnd(16)} ${account.email}`)
  return data.user.id
}

async function bindStaff(organizationId, userId, memberRole) {
  const { error } = await admin.from('organization_members').upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      role: memberRole,
      is_active: true,
    },
    { onConflict: 'organization_id,user_id' },
  )
  if (error) {
    console.error(`MEMBER_ERR ${userId}: ${error.message}`)
    return false
  }
  return true
}

async function enrollCustomer(organizationId, userId) {
  const { error } = await admin.from('organization_customers').upsert(
    {
      organization_id: organizationId,
      user_id: userId,
    },
    { onConflict: 'organization_id,user_id' },
  )
  if (
    error &&
    !error.message.toLowerCase().includes('organization_customers')
  ) {
    console.error(`ENROLL_ERR ${userId}: ${error.message}`)
    return false
  }
  return true
}

/** Roster row whose phone matches demo delivery login — enables /delivery job list in QA. */
async function upsertDemoDeliveryPartner(organizationId, account) {
  const { error } = await admin.from('delivery_partners').upsert(
    {
      organization_id: organizationId,
      full_name: 'Test Delivery partner 1',
      phone: account.phone,
      is_active: true,
      notes: 'Auto-linked to demo delivery login (seed:qa-testers)',
    },
    { onConflict: 'organization_id,phone' },
  )
  if (error) {
    // Unique index may not exist on older DBs — try update by name
    const { data: existing } = await admin
      .from('delivery_partners')
      .select('id')
      .eq('organization_id', organizationId)
      .ilike('full_name', 'Test Delivery partner 1')
      .maybeSingle()
    if (existing?.id) {
      const { error: updErr } = await admin
        .from('delivery_partners')
        .update({ phone: account.phone, is_active: true })
        .eq('id', existing.id)
      if (updErr) {
        console.error(`DELIVERY_PARTNER_ERR ${account.email}: ${updErr.message}`)
        return false
      }
      console.log(`LINKED delivery partner phone ${account.phone} for ${account.tenantSlug}`)
      return true
    }
    console.error(`DELIVERY_PARTNER_ERR ${account.email}: ${error.message}`)
    return false
  }
  console.log(`LINKED delivery partner phone ${account.phone} for ${account.tenantSlug}`)
  return true
}

async function verifyLogin(email) {
  if (!client) {
    console.warn(`SKIP_LOGIN_CHECK ${email} (no anon key)`)
    return true
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD,
  })

  if (error) {
    console.error(`LOGIN_FAIL ${email}: ${error.message}`)
    return false
  }

  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  console.log(`LOGIN_OK ${email} profile=${profile?.role ?? 'missing'}`)
  await client.auth.signOut()
  return true
}

function isProtectedEmail(email) {
  const value = email?.toLowerCase() ?? ''
  if (value === MASTER_EMAIL) return true
  if (/^demo(admin|customer|delivery)@[a-z0-9]+\.test$/.test(value)) return true
  return false
}

async function deleteRetiredUsers(keepEmails) {
  const keep = new Set([...keepEmails].map((email) => email.toLowerCase()))
  const retired = new Set(RETIRED_TEST_EMAILS.map((email) => email.toLowerCase()))
  const users = await listAllAuthUsers()
  let deleted = 0

  for (const user of users) {
    const email = user.email?.toLowerCase()
    if (!email || isProtectedEmail(email) || keep.has(email)) continue
    if (!retired.has(email)) continue

    await admin
      .from('organization_members')
      .delete()
      .eq('user_id', user.id)
    await admin
      .from('organization_customers')
      .delete()
      .eq('user_id', user.id)

    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      console.error(`DELETE_ERR ${email}: ${error.message || '{}'}`)
      await admin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', user.id)
      await admin.auth.admin.updateUserById(user.id, {
        password: `retired-${crypto.randomUUID()}`,
        email_confirm: false,
        ban_duration: '876000h',
      })
      console.log(`DISABLED ${email} (could not delete; likely order history)`)
      continue
    }

    console.log(`DELETED ${email}`)
    deleted += 1
  }

  return deleted
}

const { data: orgs, error: orgError } = await admin
  .from('organizations')
  .select('id, name, slug, status')
  .in('status', ['active', 'trialing'])
  .order('name')

if (orgError) {
  console.error(`ORG_ERR ${orgError.message}`)
  process.exit(1)
}

const restaurants = (orgs ?? []).filter((org) => org.slug)

console.log(
  `Seeding DirectApp Master + demo personas for ${restaurants.length} restaurant(s) (password ${DEMO_PASSWORD})...\n`,
)

const keepEmails = new Set([MASTER_EMAIL])
let seedOk = true

const masterId = await upsertAccount(MASTER)
if (!masterId) seedOk = false

for (const org of restaurants) {
  const accounts = tenantDemoAccounts(org)
  for (const account of accounts) {
    keepEmails.add(account.email)
    const userId = await upsertAccount(account)
    if (!userId) {
      seedOk = false
      continue
    }
    if (account.role === 'admin') {
      const ok = await bindStaff(org.id, userId, 'restaurant_owner')
      if (!ok) seedOk = false
    }
    if (account.role === 'delivery') {
      const ok = await bindStaff(org.id, userId, 'delivery')
      if (!ok) seedOk = false
      const partnerOk = await upsertDemoDeliveryPartner(org.id, account)
      if (!partnerOk) seedOk = false
    }
    if (account.role === 'customer') {
      const ok = await enrollCustomer(org.id, userId)
      if (!ok) seedOk = false
    }
  }
}

console.log('\nRemoving retired shared test users...\n')
const deleted = await deleteRetiredUsers(keepEmails)
console.log(`Deleted ${deleted} retired test user(s).\n`)

console.log('Verifying password logins...\n')
let loginOk = true
for (const email of keepEmails) {
  const ok = await verifyLogin(email)
  if (!ok) loginOk = false
}

console.log('\n--- Tenant demo logins ---')
console.log(`  platform_master  ${MASTER_EMAIL} / ${DEMO_PASSWORD}  → /master/login`)
for (const org of restaurants) {
  console.log(`\n  ${org.name} (${org.slug})`)
  for (const persona of ['admin', 'customer', 'delivery']) {
    console.log(
      `    ${persona.padEnd(10)} ${demoPersonaEmail(org.slug, persona)} / ${DEMO_PASSWORD}`,
    )
  }
}

if (seedOk && loginOk) {
  console.log(`\nALL_OK — tenant-scoped demo accounts ready (${DEMO_PASSWORD})`)
  process.exit(0)
}

console.log('\nFAILED — see errors above')
process.exit(1)
