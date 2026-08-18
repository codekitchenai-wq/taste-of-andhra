/** Minimum password length for email auth (testing-friendly). */
export const MIN_PASSWORD_LENGTH = 6

export const DEFAULT_COUNTRY_CODE = '+91'

/** sessionStorage key for post-OAuth customer redirect path. */
export const AUTH_REDIRECT_STORAGE_KEY = 'toa_auth_redirect'

/** Cross-subdomain cookie: tenant slug when Google OAuth starts (`.directapp.in`). */
export const AUTH_OAUTH_TENANT_COOKIE = 'toa_oauth_tenant'

/** Cross-subdomain cookie: post-login path paired with {@link AUTH_OAUTH_TENANT_COOKIE}. */
export const AUTH_OAUTH_NEXT_COOKIE = 'toa_oauth_next'

/**
 * Supabase Auth Site URL in production. Tenant `{slug}.directapp.in` hosts are
 * often not on the redirect allowlist, so Google returns here. Query `tenant`
 * is required so we can bounce back before the session is created.
 */
export const AUTH_OAUTH_CALLBACK_ORIGIN = (
  import.meta.env.VITE_AUTH_OAUTH_CALLBACK_ORIGIN?.trim() ||
  'https://www.thetasteofandhra.com'
).replace(/\/$/, '')

/** Local `{slug}.localhost` hops here so Google PKCE stays on localhost. */
export const AUTH_GOOGLE_CONTINUE_PARAM = 'continue'
export const AUTH_GOOGLE_CONTINUE_VALUE = 'google'

export const WHATSAPP_OTP_LENGTH = 6
export const WHATSAPP_OTP_RESEND_SECONDS = 45

/** Query flag to open address setup after first-time customer signup. */
export const AUTH_ADDRESS_SETUP_SEARCH = 'setup=1'
