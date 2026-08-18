/** Apex host used to build `{slug}.domain` storefronts. */
export const PLATFORM_ROOT_DOMAIN = (
  import.meta.env.VITE_PLATFORM_ROOT_DOMAIN?.trim() || 'directapp.in'
).replace(/^www\./i, '')

export const PLATFORM_WWW_URL = `https://www.${PLATFORM_ROOT_DOMAIN}`

/**
 * Origin Google/Supabase must return to (allowlisted Site URL).
 * Restaurant hosts are not a reliable OAuth return origin — hop here with ?tenant=.
 */
export const OAUTH_CALLBACK_ORIGIN = (
  import.meta.env.VITE_AUTH_OAUTH_CALLBACK_ORIGIN?.trim() || PLATFORM_WWW_URL
).replace(/\/$/, '')

/** Platform control-plane brand — not a restaurant tenant. */
export const PLATFORM_BRAND_NAME = 'DirectApp'
