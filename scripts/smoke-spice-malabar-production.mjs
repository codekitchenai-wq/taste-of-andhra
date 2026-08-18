/**
 * Production smoke checks for Chopsticks Spice Malabar.
 * Does not print secrets.
 *
 *   node scripts/seed-production.mjs smoke-spice-malabar-production.mjs
 */
import { createClient } from '@supabase/supabase-js'

const CANONICAL = 'chopsticksspicemalabar'
const LEGACY = 'spice-malabar'
const url = process.env.VITE_SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const adminEmail = 'spice-malabar@admin.test'
const password = 'Test@123'

if (!url || !serviceKey) {
  console.error('Missing production Supabase env')
  process.exit(1)
}

if (!url.includes('qixpsqlifwsztncjevgl')) {
  console.error('Refusing to run: not the production project URL')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const failures = []

function check(ok, message) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`)
  if (!ok) failures.push(message)
}

const { data: orgs, error: orgError } = await admin
  .from('organizations')
  .select('id, slug, name, status')
  .in('slug', [CANONICAL, LEGACY])

check(!orgError, `org lookup: ${orgError?.message || 'ok'}`)
const canonical = orgs?.find((row) => row.slug === CANONICAL)
const legacy = orgs?.find((row) => row.slug === LEGACY)
check(Boolean(canonical?.id), `canonical slug ${CANONICAL} exists`)
check(canonical?.status === 'active', `org status is ${canonical?.status ?? 'missing'}`)
check(canonical?.name === 'Spice Malabar', `org name is ${canonical?.name ?? 'missing'}`)
check(!legacy, `legacy slug ${LEGACY} is retired (found: ${legacy?.slug ?? 'none'})`)

const orgId = canonical?.id
if (orgId) {
  const { count: categoryCount, error: catError } = await admin
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('is_active', true)
  check(!catError && (categoryCount ?? 0) > 0, `active categories: ${categoryCount ?? catError?.message}`)

  const { count: dishCount, error: dishError } = await admin
    .from('dishes')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('is_available', true)
  check(!dishError && (dishCount ?? 0) >= 100, `available dishes: ${dishCount ?? dishError?.message}`)

  const { data: members, error: memberError } = await admin
    .from('organization_members')
    .select('user_id, role, is_active')
    .eq('organization_id', orgId)
    .eq('is_active', true)
  check(!memberError && (members?.length ?? 0) > 0, `active org members: ${members?.length ?? memberError?.message}`)
}

const { data: session, error: loginError } = await admin.auth.signInWithPassword({
  email: adminEmail,
  password,
})
check(!loginError && Boolean(session?.user?.id), `admin login ${adminEmail}: ${loginError?.message || 'ok'}`)

if (session?.user?.id && orgId) {
  const { data: membership } = await admin
    .from('organization_members')
    .select('role, is_active')
    .eq('organization_id', orgId)
    .eq('user_id', session.user.id)
    .maybeSingle()
  check(
    membership?.is_active && ['restaurant_owner', 'admin', 'restaurant_admin'].includes(membership?.role),
    `admin membership role=${membership?.role ?? 'none'} active=${membership?.is_active ?? false}`,
  )
}

const publicHost = `https://${CANONICAL}.directapp.in`
const pages = ['/', '/menu', '/admin/login', '/about', '/contact']
for (const path of pages) {
  const res = await fetch(`${publicHost}${path}`, { redirect: 'manual' })
  check(res.status === 200, `${publicHost}${path} → ${res.status}`)
}

const redirect = await fetch('https://spice-malabar.directapp.in/menu', {
  redirect: 'manual',
})
check(
  redirect.status === 308 &&
    redirect.headers.get('location') === `${publicHost}/menu`,
  `legacy /menu redirect → ${redirect.status} ${redirect.headers.get('location')}`,
)

const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim()
if (orgId && anonKey) {
  const pub = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { count: publicDishes, error: publicError } = await pub
    .from('dishes')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('is_available', true)
  check(
    !publicError && (publicDishes ?? 0) >= 100,
    `public menu dishes: ${publicDishes ?? publicError?.message}`,
  )

  const { count: andhraDishes, error: andhraError } = await pub
    .from('dishes')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', 'a0000000-0000-4000-8000-000000000001')
    .eq('is_available', true)
  check(
    !andhraError && (andhraDishes ?? 0) > 0,
    `Taste of Andhra dishes still isolated: ${andhraDishes ?? andhraError?.message}`,
  )
  check(
    (publicDishes ?? 0) !== (andhraDishes ?? 0),
    `tenant menus are not identical (${publicDishes} vs ${andhraDishes})`,
  )
}

const toa = await fetch('https://www.thetasteofandhra.com/', { redirect: 'manual' })
check(
  toa.status === 200 || toa.status === 308 || toa.status === 301,
  `Taste of Andhra apex → ${toa.status}`,
)

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`)
  process.exit(1)
}

console.log('\nAll production smoke checks passed')
