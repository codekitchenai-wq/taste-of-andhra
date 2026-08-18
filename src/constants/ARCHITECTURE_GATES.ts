/** Platform architecture gates — default OFF (hold) unless explicitly enabled. */

function envFlag(name: string, defaultValue = false): boolean {
  const raw = import.meta.env[name]
  if (typeof raw !== 'string') return defaultValue
  const normalized = raw.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false
  }
  return defaultValue
}

/** Resolve storefront tenant from hostname/slug. Off → Taste of Andhra only. */
export const ENABLE_HOST_TENANT_RESOLUTION = envFlag(
  'VITE_ENABLE_HOST_TENANT_RESOLUTION',
  false,
)

/** Admin/delivery routes require organization_members for the active org. */
export const ENABLE_SCOPED_ORG_ADMIN_AUTH = envFlag(
  'VITE_ENABLE_SCOPED_ORG_ADMIN_AUTH',
  true,
)

/** Reserved: Route mode UI/API (never expose until backend ready). */
export const ENABLE_RAZORPAY_ROUTE = envFlag('VITE_ENABLE_RAZORPAY_ROUTE', false)

/** Reserved: Meta Embedded Signup button. */
export const ENABLE_META_EMBEDDED_SIGNUP = envFlag(
  'VITE_ENABLE_META_EMBEDDED_SIGNUP',
  false,
)

/** Reserved: AI entry points. */
export const ENABLE_AI = envFlag('VITE_ENABLE_AI', false)

/**
 * Taste of Andhra custom domains (thetasteofandhra.com).
 * Off: those hosts bounce to www.directapp.in so Google Site URL cannot
 * leave customers on Taste of Andhra. Re-enable with VITE_ENABLE_TASTE_OF_ANDHRA_CUSTOM_DOMAIN=true.
 */
export const ENABLE_TASTE_OF_ANDHRA_CUSTOM_DOMAIN = envFlag(
  'VITE_ENABLE_TASTE_OF_ANDHRA_CUSTOM_DOMAIN',
  false,
)
