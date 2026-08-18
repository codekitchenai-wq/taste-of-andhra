import { PLATFORM_WWW_URL } from '@/constants/PLATFORM'

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
 * Default fallback when redirectTo is omitted. Production Google login uses
 * the current restaurant origin (see googleOAuthRedirectTo).
 */
export const AUTH_OAUTH_CALLBACK_ORIGIN = (
  import.meta.env.VITE_AUTH_OAUTH_CALLBACK_ORIGIN?.trim() || PLATFORM_WWW_URL
).replace(/\/$/, '')

/** Local `{slug}.localhost` hops here so Google PKCE stays on localhost. */
export const AUTH_GOOGLE_CONTINUE_PARAM = 'continue'
export const AUTH_GOOGLE_CONTINUE_VALUE = 'google'

/** sessionStorage: Google OAuth was started on the Site URL; hand off when it returns. */
export const AUTH_OAUTH_IN_FLIGHT_STORAGE_KEY = 'toa_oauth_in_flight'

export const WHATSAPP_OTP_LENGTH = 6
export const WHATSAPP_OTP_RESEND_SECONDS = 45

/** Query flag to open address setup after first-time customer signup. */
export const AUTH_ADDRESS_SETUP_SEARCH = 'setup=1'
