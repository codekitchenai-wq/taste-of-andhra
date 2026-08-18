import { TASTE_OF_ANDHRA_ORG_ID } from '@/constants/ORGANIZATION'
import { SPICE_MALABAR_SLUG, TASTE_OF_ANDHRA_SLUG } from '@/constants/TENANTS'
import type { AppPersonaRole, UserRole } from '@/types/enums'

export interface DemoAccount {
  email: string
  password: string
  fullName: string
  phone: string
  role: UserRole
  /** Optional tester group label for docs / UI. */
  group?: string
  /** Tenant this account belongs to (display). */
  tenant?: string
  /** Organization slug used to scope login helpers. */
  tenantSlug?: string
}

export interface DemoTenant {
  id?: string
  name: string
  slug: string
  /** Domain used in demo emails (`demoadmin@{emailSlug}.test`). */
  emailSlug: string
  productionOrigin: string
}

/**
 * TEMPORARY — QA / local testing helpers in the public footer and login screens.
 * Set to `false` before production release.
 */
export const SHOW_TEST_HELPERS = true

/** Shared password for all seeded test personas (including DirectApp Master). */
export const DEMO_PASSWORD = 'Test@123'

const PERSONA_META: Record<
  AppPersonaRole,
  { fullNamePrefix: string; phoneOffset: number }
> = {
  customer: { fullNamePrefix: 'Demo Customer', phoneOffset: 1 },
  admin: { fullNamePrefix: 'Demo Admin', phoneOffset: 2 },
  delivery: { fullNamePrefix: 'Demo Delivery', phoneOffset: 3 },
}

/** Taste of Andhra — first restaurant tenant. */
export const TENANT_TASTE_OF_ANDHRA = {
  id: TASTE_OF_ANDHRA_ORG_ID,
  name: 'The Taste of Andhra',
  slug: TASTE_OF_ANDHRA_SLUG,
} as const

/**
 * Login emails use `.test` because the form requires a valid address.
 * Local-part matches the requested persona (`demoadmin`, `democustomer`, `demodelivery`).
 */
export function demoEmailSlug(orgSlug: string | null | undefined): string {
  const slug = orgSlug?.trim().toLowerCase() ?? ''
  if (!slug) return 'tasteofandhra'
  if (slug === TASTE_OF_ANDHRA_SLUG || slug === 'taste-of-andhra') {
    return 'tasteofandhra'
  }
  if (slug === SPICE_MALABAR_SLUG || slug === 'spice-malabar') {
    return 'chopsticksspicemalabar'
  }
  return slug.replace(/-/g, '')
}

export function demoPersonaEmail(
  orgSlug: string,
  persona: AppPersonaRole,
): string {
  return `demo${persona}@${demoEmailSlug(orgSlug)}.test`
}

export const DEMO_TENANTS: DemoTenant[] = [
  {
    id: TASTE_OF_ANDHRA_ORG_ID,
    name: 'The Taste of Andhra',
    slug: TASTE_OF_ANDHRA_SLUG,
    emailSlug: 'tasteofandhra',
    productionOrigin: 'https://www.thetasteofandhra.com',
  },
  {
    name: 'Chopstick Spice Malabar',
    slug: SPICE_MALABAR_SLUG,
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

function phoneForTenantPersona(emailSlug: string, persona: AppPersonaRole): string {
  const seed = [...emailSlug].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const prefix = 9000000000 + (seed % 800000) * 10
  return String(prefix + PERSONA_META[persona].phoneOffset)
}

export function tenantPersonaAccounts(org: {
  slug: string
  name?: string | null
}): DemoAccount[] {
  const name = org.name?.trim() || org.slug
  return (['customer', 'admin', 'delivery'] as const).map((persona) => ({
    email: demoPersonaEmail(org.slug, persona),
    password: DEMO_PASSWORD,
    fullName: `${name} ${PERSONA_META[persona].fullNamePrefix}`,
    phone: phoneForTenantPersona(demoEmailSlug(org.slug), persona),
    role: persona,
    group: 'Demo',
    tenant: name,
    tenantSlug: org.slug,
  }))
}

/**
 * DirectApp Master — controls tenants, features, and entitlements.
 * Seed via: npm run seed:qa-testers
 */
export const MASTER_ACCOUNT: DemoAccount = {
  email: 'master@tasteofandhra.test',
  password: DEMO_PASSWORD,
  fullName: 'DirectApp Master',
  phone: '9000000099',
  role: 'platform_master',
  group: 'DirectApp',
  tenant: 'DirectApp (platform)',
}

/**
 * Primary Taste of Andhra demo accounts (legacy shape for callers that
 * still index by persona without a tenant slug).
 */
export const DEMO_ACCOUNTS: Record<AppPersonaRole, DemoAccount> = {
  customer: tenantPersonaAccounts(TENANT_TASTE_OF_ANDHRA).find(
    (account) => account.role === 'customer',
  )!,
  admin: tenantPersonaAccounts(TENANT_TASTE_OF_ANDHRA).find(
    (account) => account.role === 'admin',
  )!,
  delivery: tenantPersonaAccounts(TENANT_TASTE_OF_ANDHRA).find(
    (account) => account.role === 'delivery',
  )!,
}

/** Every seeded login (DirectApp Master + per-tenant demos) for docs and Master UI. */
export const ALL_TEST_ACCOUNTS: DemoAccount[] = [
  MASTER_ACCOUNT,
  ...DEMO_TENANTS.flatMap((tenant) => tenantPersonaAccounts(tenant)),
]

export function loginPathForRole(role: UserRole): string {
  if (role === 'platform_master') return '/master/login'
  if (role === 'admin') return '/admin/login'
  if (role === 'delivery') return '/delivery/login'
  return '/login'
}

export function localLoginUrl(orgSlug: string | undefined, role: UserRole): string {
  const path = loginPathForRole(role)
  if (role === 'platform_master') return `http://127.0.0.1:5173${path}`
  if (!orgSlug || orgSlug === TASTE_OF_ANDHRA_SLUG) {
    return `http://127.0.0.1:5173${path}`
  }
  return `http://127.0.0.1:5173${path}?tenant=${encodeURIComponent(orgSlug)}`
}

export function productionLoginUrl(
  tenant: Pick<DemoTenant, 'productionOrigin'>,
  role: UserRole,
): string {
  if (role === 'platform_master') return 'https://www.directapp.in/master/login'
  return `${tenant.productionOrigin}${loginPathForRole(role)}`
}

export function accountsForRole(
  role: UserRole,
  tenantSlug?: string | null,
): DemoAccount[] {
  if (role === 'platform_master') return [MASTER_ACCOUNT]
  return tenantPersonaAccounts({
    slug: tenantSlug || TASTE_OF_ANDHRA_SLUG,
  }).filter((account) => account.role === role)
}

export function primaryAccountForRole(
  role: UserRole,
  tenantSlug?: string | null,
): DemoAccount {
  if (role === 'platform_master') return MASTER_ACCOUNT
  return (
    accountsForRole(role, tenantSlug)[0] ??
    DEMO_ACCOUNTS[role as AppPersonaRole]
  )
}

export function isAppPersonaRole(role: UserRole): role is AppPersonaRole {
  return role === 'customer' || role === 'admin' || role === 'delivery'
}
