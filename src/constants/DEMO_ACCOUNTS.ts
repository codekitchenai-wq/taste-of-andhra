import type { AppPersonaRole, UserRole } from '@/types/enums'

export interface DemoAccount {
  email: string
  password: string
  fullName: string
  phone: string
  role: AppPersonaRole
}

/**
 * TEMPORARY — QA / local testing helpers in the public footer.
 * Set to `false` (or remove FooterTestHelpers) before production release.
 */
export const SHOW_TEST_HELPERS = true

/** Shared password for all seeded test personas. */
export const DEMO_PASSWORD = '123456'

/**
 * One ready-to-use account per persona for local / QA testing.
 * Create them via the login screens or `npm run seed:demo-users`.
 */
export const DEMO_ACCOUNTS: Record<AppPersonaRole, DemoAccount> = {
  customer: {
    email: 'customer@tasteofandhra.test',
    password: DEMO_PASSWORD,
    fullName: 'Demo Customer',
    phone: '9876543210',
    role: 'customer',
  },
  admin: {
    email: 'admin@tasteofandhra.test',
    password: DEMO_PASSWORD,
    fullName: 'Demo Admin',
    phone: '9876543211',
    role: 'admin',
  },
  delivery: {
    email: 'delivery@tasteofandhra.test',
    password: DEMO_PASSWORD,
    fullName: 'Demo Delivery',
    phone: '9876543212',
    role: 'delivery',
  },
}

export function isAppPersonaRole(role: UserRole): role is AppPersonaRole {
  return role === 'customer' || role === 'admin' || role === 'delivery'
}
