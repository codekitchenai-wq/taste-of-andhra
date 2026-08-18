/** Shared demo-login helpers for seed + Excel scripts. */

export const DEMO_PASSWORD = 'Test@123'
export const MASTER_EMAIL = 'master@tasteofandhra.test'
export const MASTER_NAME = 'DirectApp Master'
export const MASTER_PHONE = '9000000099'
export const LOCAL_ORIGIN = 'http://127.0.0.1:5173'
export const MASTER_PRODUCTION_LOGIN = 'https://www.directapp.in/master/login'

export const KNOWN_TENANTS = [
  {
    name: 'The Taste of Andhra',
    slug: 'thetasteofandhra',
    emailSlug: 'tasteofandhra',
    productionOrigin: 'https://www.thetasteofandhra.com',
  },
  {
    name: 'Chopstick Spice Malabar',
    slug: 'chopsticksspicemalabar',
    emailSlug: 'chopsticksspicemalabar',
    productionOrigin: 'https://chopsticksspicemalabar.directapp.in',
  },
  {
    name: 'Devi Home Foods',
    slug: 'devihomefoods',
    emailSlug: 'devihomefoods',
    productionOrigin: 'https://devihomefoods.directapp.in',
  },
]

export const RETIRED_TEST_EMAILS = [
  'customer@tasteofandhra.test',
  'admin@tasteofandhra.test',
  'delivery@tasteofandhra.test',
  'tester1.customer@thetasteofandhra.com',
  'tester1.admin@thetasteofandhra.com',
  'tester1.delivery@thetasteofandhra.com',
  'tester2.customer@thetasteofandhra.com',
  'tester2.admin@thetasteofandhra.com',
  'tester2.delivery@thetasteofandhra.com',
  'spice-malabar@admin.test',
  'spicemalabaradmin@spicemalabar.test',
  'demo@spicemalabar.test',
  'devihomefoodsadmin@devihomefoods.test',
  'demo@devihomefoods.test',
  'admin@staging.local',
]

const PERSONA_PHONE_OFFSET = {
  customer: 1,
  admin: 2,
  delivery: 3,
}

export function demoEmailSlug(orgSlug) {
  const slug = String(orgSlug || '')
    .trim()
    .toLowerCase()
  if (!slug) return 'tasteofandhra'
  if (slug === 'thetasteofandhra' || slug === 'taste-of-andhra') {
    return 'tasteofandhra'
  }
  if (slug === 'chopsticksspicemalabar' || slug === 'spice-malabar') {
    return 'chopsticksspicemalabar'
  }
  return slug.replace(/-/g, '')
}

export function demoPersonaEmail(orgSlug, persona) {
  return `demo${persona}@${demoEmailSlug(orgSlug)}.test`
}

export function phoneForTenantPersona(orgSlug, persona) {
  const emailSlug = demoEmailSlug(orgSlug)
  const seed = [...emailSlug].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const prefix = 9000000000 + (seed % 800000) * 10
  return String(prefix + PERSONA_PHONE_OFFSET[persona])
}

export function loginPathForRole(role) {
  if (role === 'platform_master') return '/master/login'
  if (role === 'admin') return '/admin/login'
  if (role === 'delivery') return '/delivery/login'
  return '/login'
}

export function localLoginUrl(orgSlug, role) {
  const path = loginPathForRole(role)
  if (role === 'platform_master') return `${LOCAL_ORIGIN}${path}`
  if (!orgSlug || orgSlug === 'thetasteofandhra') return `${LOCAL_ORIGIN}${path}`
  return `${LOCAL_ORIGIN}${path}?tenant=${encodeURIComponent(orgSlug)}`
}

export function productionLoginUrl(productionOrigin, role) {
  if (role === 'platform_master') return MASTER_PRODUCTION_LOGIN
  return `${productionOrigin}${loginPathForRole(role)}`
}

export function tenantDemoAccounts(org) {
  const name = org.name || org.slug
  return ['customer', 'admin', 'delivery'].map((persona) => ({
    email: demoPersonaEmail(org.slug, persona),
    fullName: `${name} Demo ${persona.charAt(0).toUpperCase()}${persona.slice(1)}`,
    phone: phoneForTenantPersona(org.slug, persona),
    role: persona,
    tenantName: name,
    tenantSlug: org.slug,
  }))
}

export function knownTenantForSlug(slug) {
  const key = demoEmailSlug(slug)
  return KNOWN_TENANTS.find(
    (tenant) => tenant.slug === slug || tenant.emailSlug === key,
  )
}
