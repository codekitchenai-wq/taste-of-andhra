/** Minimum password length for email auth (testing-friendly). */
export const MIN_PASSWORD_LENGTH = 6

export const DEFAULT_COUNTRY_CODE = '+91'

/** sessionStorage key for post-OAuth customer redirect path. */
export const AUTH_REDIRECT_STORAGE_KEY = 'toa_auth_redirect'

/** Local `{slug}.localhost` hops here so Google PKCE stays on localhost. */
export const AUTH_GOOGLE_CONTINUE_PARAM = 'continue'
export const AUTH_GOOGLE_CONTINUE_VALUE = 'google'

export const WHATSAPP_OTP_LENGTH = 6
export const WHATSAPP_OTP_RESEND_SECONDS = 45

/** Query flag to open address setup after first-time customer signup. */
export const AUTH_ADDRESS_SETUP_SEARCH = 'setup=1'
