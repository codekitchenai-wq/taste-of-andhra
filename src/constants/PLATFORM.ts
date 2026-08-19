/** Apex host used to build `{slug}.domain` storefronts. */
export const PLATFORM_ROOT_DOMAIN = (
  import.meta.env.VITE_PLATFORM_ROOT_DOMAIN?.trim() || 'directapp.in'
).replace(/^www\./i, '')

export const PLATFORM_WWW_URL = `https://www.${PLATFORM_ROOT_DOMAIN}`

/**
 * Origin used for Supabase OAuth `redirectTo` and the preflight hop.
 * Must match Supabase Authentication → Redirect URLs (e.g. `https://www.directapp.in/**`).
 */
export const OAUTH_CALLBACK_ORIGIN = (
  import.meta.env.VITE_AUTH_OAUTH_CALLBACK_ORIGIN?.trim() || PLATFORM_WWW_URL
).replace(/\/$/, '')

/** Platform control-plane brand — not a restaurant tenant. */
export const PLATFORM_BRAND_NAME = 'DirectApp'
