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
}

/**
 * TEMPORARY — QA / local testing helpers in the public footer and login screens.
 * Set to `false` before production release.
 */
export const SHOW_TEST_HELPERS = true

/** Shared password for all seeded test personas (including Superuser). */
export const DEMO_PASSWORD = 'Test@123'

/** Taste of Andhra — first restaurant tenant. */
export const TENANT_TASTE_OF_ANDHRA = {
  id: 'a0000000-0000-4000-8000-000000000001',
  name: 'The Taste of Andhra',
  slug: 'thetasteofandhra',
} as const

/**
 * Platform Superuser — controls tenants, features, and entitlements (Master console).
 * Seed via: npm run seed:qa-testers
 */
export const MASTER_ACCOUNT: DemoAccount = {
  email: 'master@tasteofandhra.test',
  password: DEMO_PASSWORD,
  fullName: 'Platform Superuser',
  phone: '9000000099',
  role: 'platform_master',
  group: 'Superuser',
  tenant: 'Platform (all tenants)',
}

/**
 * Primary one-click demo accounts shown on each persona login screen.
 * Password: Test@123
 */
export const DEMO_ACCOUNTS: Record<AppPersonaRole, DemoAccount> = {
  customer: {
    email: 'customer@tasteofandhra.test',
    password: DEMO_PASSWORD,
    fullName: 'Demo Customer',
    phone: '9876543210',
    role: 'customer',
    group: 'Demo',
    tenant: TENANT_TASTE_OF_ANDHRA.name,
  },
  admin: {
    email: 'admin@tasteofandhra.test',
    password: DEMO_PASSWORD,
    fullName: 'Demo Admin',
    phone: '9876543211',
    role: 'admin',
    group: 'Demo',
    tenant: TENANT_TASTE_OF_ANDHRA.name,
  },
  delivery: {
    email: 'delivery@tasteofandhra.test',
    password: DEMO_PASSWORD,
    fullName: 'Demo Delivery',
    phone: '9876543212',
    role: 'delivery',
    group: 'Demo',
    tenant: TENANT_TASTE_OF_ANDHRA.name,
  },
}

/** Parallel QA testers (Tester 1 / Tester 2) — same password, separate users. */
export const TESTER_ACCOUNTS: DemoAccount[] = [
  {
    email: 'tester1.customer@thetasteofandhra.com',
    password: DEMO_PASSWORD,
    fullName: 'Tester 1 Customer',
    phone: '9000000001',
    role: 'customer',
    group: 'Tester 1',
    tenant: TENANT_TASTE_OF_ANDHRA.name,
  },
  {
    email: 'tester1.admin@thetasteofandhra.com',
    password: DEMO_PASSWORD,
    fullName: 'Tester 1 Admin',
    phone: '9000000011',
    role: 'admin',
    group: 'Tester 1',
    tenant: TENANT_TASTE_OF_ANDHRA.name,
  },
  {
    email: 'tester1.delivery@thetasteofandhra.com',
    password: DEMO_PASSWORD,
    fullName: 'Tester 1 Delivery',
    phone: '9000000021',
    role: 'delivery',
    group: 'Tester 1',
    tenant: TENANT_TASTE_OF_ANDHRA.name,
  },
  {
    email: 'tester2.customer@thetasteofandhra.com',
    password: DEMO_PASSWORD,
    fullName: 'Tester 2 Customer',
    phone: '9000000002',
    role: 'customer',
    group: 'Tester 2',
    tenant: TENANT_TASTE_OF_ANDHRA.name,
  },
  {
    email: 'tester2.admin@thetasteofandhra.com',
    password: DEMO_PASSWORD,
    fullName: 'Tester 2 Admin',
    phone: '9000000012',
    role: 'admin',
    group: 'Tester 2',
    tenant: TENANT_TASTE_OF_ANDHRA.name,
  },
  {
    email: 'tester2.delivery@thetasteofandhra.com',
    password: DEMO_PASSWORD,
    fullName: 'Tester 2 Delivery',
    phone: '9000000022',
    role: 'delivery',
    group: 'Tester 2',
    tenant: TENANT_TASTE_OF_ANDHRA.name,
  },
]

/** Every seeded login (Superuser + demos + testers) for docs and Master UI. */
export const ALL_TEST_ACCOUNTS: DemoAccount[] = [
  MASTER_ACCOUNT,
  ...Object.values(DEMO_ACCOUNTS),
  ...TESTER_ACCOUNTS,
]

export function accountsForRole(role: UserRole): DemoAccount[] {
  return ALL_TEST_ACCOUNTS.filter((account) => account.role === role)
}

export function primaryAccountForRole(role: UserRole): DemoAccount {
  if (role === 'platform_master') return MASTER_ACCOUNT
  return DEMO_ACCOUNTS[role as AppPersonaRole]
}

export function isAppPersonaRole(role: UserRole): role is AppPersonaRole {
  return role === 'customer' || role === 'admin' || role === 'delivery'
}
