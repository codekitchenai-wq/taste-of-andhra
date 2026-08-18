/**
 * Create/update Spice Malabar admin logins without touching the menu.
 *
 *   node scripts/seed-production.mjs ensure-spice-malabar-admin.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SLUGS = ['chopsticksspicemalabar', 'spice-malabar']
const PASSWORD = 'Test@123'
const ACCOUNTS = [
  {
    email: 'spice-malabar@admin.test',
    password: PASSWORD,
    fullName: 'Spice Malabar Admin',
    phone: '7841800101',
    role: 'admin',
  },
  {
    email: 'spicemalabaradmin@spicemalabar.test',
    password: PASSWORD,
    fullName: 'Spice Malabar Admin (legacy)',
    phone: '7841800101',
    role: 'admin',
  },
]

const url = process.env.VITE_SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: org, error: orgError } = await admin
  .from('organizations')
  .select('id, slug')
  .in('slug', SLUGS)
  .limit(1)
  .maybeSingle()

if (orgError || !org?.id) {
  console.error(orgError?.message || 'Spice Malabar organization not found')
  process.exit(1)
}

async function findUserByEmail(email) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 20; page += 1) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (listed.error) throw new Error(listed.error.message)
    const users = listed.data?.users ?? []
    const existing = users.find((user) => user.email?.toLowerCase() === target)
    if (existing) return existing
    if (users.length < 200) return null
  }
  return null
}

async function ensureAuthUser(account) {
  const existing = await findUserByEmail(account.email)

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
  if (error) {
    if (account.email !== PRIMARY.email) {
      console.warn(
        `Skipped ${account.email}: ${JSON.stringify({
          message: error.message,
          status: error.status,
          code: error.code,
        })}`,
      )
      return { id: null, created: false, skipped: true }
    }
    throw new Error(
      `createUser ${account.email}: ${JSON.stringify({
        message: error.message,
        status: error.status,
        code: error.code,
        name: error.name,
      })}`,
    )
  }
  if (!data?.user?.id) {
    throw new Error(`createUser ${account.email}: no user returned`)
  }
  return { id: data.user.id, created: true }
}

const PRIMARY = ACCOUNTS[0]

const { data: members } = await admin
  .from('organization_members')
  .select('user_id, role, is_active')
  .eq('organization_id', org.id)
  .eq('is_active', true)

const ownerId = members?.[0]?.user_id
if (ownerId) {
  const existingPrimary = await findUserByEmail(PRIMARY.email)
  if (!existingPrimary) {
    const { error: renameError } = await admin.auth.admin.updateUserById(
      ownerId,
      {
        email: PRIMARY.email,
        password: PRIMARY.password,
        email_confirm: true,
        user_metadata: {
          full_name: PRIMARY.fullName,
          role: PRIMARY.role,
          phone: PRIMARY.phone,
        },
      },
    )
    if (renameError) {
      console.warn(
        `Could not rename existing owner email: ${JSON.stringify({
          message: renameError.message,
          status: renameError.status,
          code: renameError.code,
        })}`,
      )
    } else {
      console.log(`Renamed existing owner to ${PRIMARY.email}`)
    }
  }
}

for (const account of ACCOUNTS) {
  const user = await ensureAuthUser(account)
  if (!user.id) continue
  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: user.id,
      email: account.email,
      full_name: account.fullName,
      phone: account.phone,
      role: account.role,
      is_active: true,
    },
    { onConflict: 'id' },
  )
  if (profileError) throw new Error(`profile ${account.email}: ${profileError.message}`)

  const { error: memberError } = await admin.from('organization_members').upsert(
    {
      organization_id: org.id,
      user_id: user.id,
      role: 'restaurant_owner',
      is_active: true,
    },
    { onConflict: 'organization_id,user_id' },
  )
  if (memberError) throw new Error(`member ${account.email}: ${memberError.message}`)

  console.log(
    `${user.created ? 'Created' : 'Updated'} ${account.email} on ${org.slug}`,
  )
}

console.log('Admin accounts ready. Password: Test@123')
