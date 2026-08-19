/** Minimum password length for email auth (testing-friendly). */
export const MIN_PASSWORD_LENGTH = 6

export const DEFAULT_COUNTRY_CODE = '+91'

/** sessionStorage key for post-login customer redirect path. */
export const AUTH_REDIRECT_STORAGE_KEY = 'toa_auth_redirect'

/** Cross-subdomain cookie bridging Google OAuth back to the restaurant host. */
export const OAUTH_TENANT_COOKIE = 'toa_oauth_tenant'

/** Same-origin backup on www.directapp.in (survives Google even if ?tenant= is dropped). */
export const OAUTH_TENANT_STORAGE_KEY = 'toa_oauth_tenant'

/** Query flag on the platform login hop that starts Google OAuth. */
export const OAUTH_CONTINUE_GOOGLE = 'google'

export const WHATSAPP_OTP_LENGTH = 6
export const WHATSAPP_OTP_RESEND_SECONDS = 45

/** Query flag to open address setup after first-time customer signup. */
export const AUTH_ADDRESS_SETUP_SEARCH = 'setup=1'
