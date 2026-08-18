import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Profile } from '@/types/Profile'
import type { UserRole } from '@/types/enums'
import { AUTH_OAUTH_IN_FLIGHT_STORAGE_KEY, AUTH_REDIRECT_STORAGE_KEY, MIN_PASSWORD_LENGTH } from '@/constants/AUTH'
import { ROUTES } from '@/constants/ROUTES'
import { supabase } from '@/services/supabaseClient'
import { mapProfile } from '@/utils/mapProfile'
import { persistOAuthTenantCookie } from '@/utils/authTenantCookie'
import {
  googleOAuthPreflightUrl,
  googleOAuthRedirectTo,
} from '@/utils/oauthRedirect'
import { resolveTenantSlugFromLocation } from '@/utils/tenantHost'
import { normalizeIndianPhone } from '@/utils/phone'
import { isValidEmail, isValidPassword, isValidPhone } from '@/utils/validation'

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
  fullName: string
  role: UserRole
  phone?: string
}

function mapAuthError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Invalid email or password.'
  }

  if (normalized.includes('user already registered')) {
    return 'This email already has a login. Sign in or continue with Google to join this restaurant.'
  }

  if (normalized.includes('duplicate key') && normalized.includes('phone')) {
    return 'This phone number is already registered.'
  }

  if (normalized.includes('duplicate key') && normalized.includes('email')) {
    return 'This email is already registered.'
  }

  if (normalized.includes('password should be at least')) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  if (normalized.includes('email not confirmed')) {
    return 'Email not confirmed. Disable email confirmation in Supabase Auth settings for testing.'
  }

  if (normalized.includes('signup is disabled')) {
    return 'Sign-ups are disabled in Supabase Auth settings.'
  }

  if (
    normalized.includes('provider is not enabled') ||
    normalized.includes('unsupported provider')
  ) {
    return 'Google sign-in is not enabled. Enable the Google provider in Supabase Auth settings.'
  }

  return message
}

async function fetchProfile(userId: string): Promise<ServiceResponse<Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    return createErrorResponse(
      'Unable to load your profile.',
      error.message,
    )
  }

  if (!data) {
    const created = await createProfileFromSession(userId)
    if (created.success) return created
    return createErrorResponse('Profile not found.')
  }

  const profile = mapProfile(data)

  if (!profile.is_active) {
    await supabase.auth.signOut()
    return createErrorResponse('Your account has been deactivated.')
  }

  return createSuccessResponse(profile)
}

async function createProfileFromSession(
  userId: string,
): Promise<ServiceResponse<Profile>> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user || user.id !== userId) {
    return createErrorResponse('Profile not found.')
  }

  const metadata = user.user_metadata ?? {}
  const fullName =
    (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata.name === 'string' && metadata.name.trim()) ||
    'Customer'
  const avatar =
    (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
    (typeof metadata.picture === 'string' && metadata.picture) ||
    null

  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      full_name: fullName,
      email: user.email ?? null,
      role: 'customer',
      avatar_url: avatar,
    },
    { onConflict: 'id' },
  )

  if (error) {
    return createErrorResponse('Profile not found.', error.message)
  }

  const { data, error: reloadError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (reloadError || !data) {
    return createErrorResponse('Profile not found.')
  }

  return createSuccessResponse(mapProfile(data))
}

/** Email/password login for all personas. */
export async function login(
  input: LoginInput,
): Promise<ServiceResponse<Profile>> {
  const email = input.email.trim().toLowerCase()

  if (!isValidEmail(email)) {
    return createErrorResponse('Please enter a valid email address.')
  }

  if (!input.password) {
    return createErrorResponse('Password is required.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  })

  if (error) {
    return createErrorResponse(mapAuthError(error.message), error.message)
  }

  if (!data.user) {
    return createErrorResponse('Login failed. Please try again.')
  }

  return fetchProfile(data.user.id)
}

/** Create a new email/password account for any persona (testing). */
export async function register(
  input: RegisterInput,
): Promise<ServiceResponse<Profile>> {
  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim()
  const password = input.password

  if (!isValidEmail(email)) {
    return createErrorResponse('Please enter a valid email address.')
  }

  if (fullName.length < 2) {
    return createErrorResponse('Full name must be at least 2 characters.')
  }

  if (!isValidPassword(password)) {
    return createErrorResponse(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    )
  }

  let phone: string | undefined

  if (input.phone?.trim()) {
    const normalizedPhone = normalizeIndianPhone(input.phone)

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      return createErrorResponse('Phone number must be exactly 10 digits.')
    }

    phone = normalizedPhone
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: input.role,
        phone,
      },
    },
  })

  if (error) {
    if (
      input.role === 'customer' &&
      error.message.toLowerCase().includes('user already registered')
    ) {
      const existing = await login({ email, password })
      if (existing.success) return existing
      return createErrorResponse(
        'This email already has a login. Sign in or continue with Google to join this restaurant.',
        error.message,
      )
    }
    return createErrorResponse(mapAuthError(error.message), error.message)
  }

  if (!data.user) {
    return createErrorResponse('Registration failed. Please try again.')
  }

  if (!data.session) {
    return createErrorResponse(
      'Account created, but email confirmation is required. Disable "Confirm email" under Supabase Auth → Providers → Email for testing, then sign in.',
    )
  }

  return fetchProfile(data.user.id)
}

async function readFunctionsErrorMessage(
  error: { message?: string; context?: Response } | null,
  fallback: string,
): Promise<string> {
  if (!error) return fallback
  try {
    const context = error.context
    if (context) {
      const body = (await context.json()) as { error?: string; message?: string }
      if (body?.error) return body.error
      if (body?.message) return body.message
    }
  } catch {
    // ignore parse failures
  }
  return error.message || fallback
}

export interface WhatsAppOtpRequestResult {
  resendAfterSeconds: number
  /** Present only in mock / local WhatsApp mode. */
  devCode?: string
}

export interface WhatsAppOtpVerifyInput {
  phone: string
  code: string
  fullName?: string
}

/** Send a 6-digit login code to the customer's WhatsApp. */
export async function requestWhatsAppOtp(
  phone: string,
): Promise<ServiceResponse<WhatsAppOtpRequestResult>> {
  const normalized = normalizeIndianPhone(phone)

  if (!normalized || !isValidPhone(normalized)) {
    return createErrorResponse('Enter a valid 10-digit mobile number.')
  }

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean
    error?: string
    resendAfterSeconds?: number
    devCode?: string
  }>('whatsapp-otp', {
    body: { action: 'send', phone: normalized },
  })

  if (error) {
    const detail = await readFunctionsErrorMessage(
      error,
      'Unable to send the WhatsApp code.',
    )
    return createErrorResponse(detail, error.message)
  }

  if (data?.error) {
    return createErrorResponse(data.error)
  }

  if (!data?.ok) {
    return createErrorResponse('Unable to send the WhatsApp code.')
  }

  return createSuccessResponse({
    resendAfterSeconds: data.resendAfterSeconds ?? 45,
    devCode: data.devCode,
  })
}

/**
 * Verify the WhatsApp OTP, establish a Supabase session, and load the profile.
 * New numbers are registered as customers.
 */
export async function loginWithWhatsAppOtp(
  input: WhatsAppOtpVerifyInput,
): Promise<ServiceResponse<Profile>> {
  const normalized = normalizeIndianPhone(input.phone)
  const code = input.code.replace(/\D/g, '')

  if (!normalized || !isValidPhone(normalized)) {
    return createErrorResponse('Enter a valid 10-digit mobile number.')
  }

  if (!/^\d{6}$/.test(code)) {
    return createErrorResponse('Enter the 6-digit code sent on WhatsApp.')
  }

  const fullName = input.fullName?.trim()

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean
    error?: string
    access_token?: string
    refresh_token?: string
    token_hash?: string
    type?: 'email' | 'magiclink'
  }>('whatsapp-otp', {
    body: {
      action: 'verify',
      phone: normalized,
      code,
      fullName: fullName || undefined,
    },
  })

  if (error) {
    const detail = await readFunctionsErrorMessage(
      error,
      'Unable to verify the WhatsApp code.',
    )
    return createErrorResponse(detail, error.message)
  }

  if (data?.error) {
    return createErrorResponse(data.error)
  }

  if (!data?.ok) {
    return createErrorResponse('Unable to verify the WhatsApp code.')
  }

  if (data.token_hash) {
    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: 'email',
    })

    if (otpError || !otpData.user) {
      return createErrorResponse(
        'Code verified, but the session could not be saved. Please try again.',
        otpError?.message,
      )
    }

    return fetchProfile(otpData.user.id)
  }

  if (!data.access_token || !data.refresh_token) {
    return createErrorResponse('Unable to verify the WhatsApp code.')
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })

  if (sessionError || !sessionData.user) {
    return createErrorResponse(
      'Code verified, but the session could not be saved. Please try again.',
      sessionError?.message,
    )
  }

  return fetchProfile(sessionData.user.id)
}

/**
 * Start Google OAuth for customers. Redirects the browser to Google;
 * on return, Supabase restores the session and GuestRoute finishes navigation.
 */
export async function loginWithGoogle(
  redirectPath: string = ROUTES.HOME,
): Promise<ServiceResponse<null>> {
  const tenantSlug = resolveTenantSlugFromLocation({ persist: false })
  if (tenantSlug) {
    persistOAuthTenantCookie(tenantSlug, redirectPath)
  }

  try {
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, redirectPath)
  } catch {
    // Private browsing may block sessionStorage; fall back to home.
  }

  const preflight = googleOAuthPreflightUrl(ROUTES.LOGIN, redirectPath)
  if (preflight) {
    window.location.assign(preflight)
    return createSuccessResponse(null)
  }

  try {
    sessionStorage.setItem(AUTH_OAUTH_IN_FLIGHT_STORAGE_KEY, '1')
  } catch {
    // ignore
  }

  await supabase.auth.signOut({ scope: 'local' })

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: googleOAuthRedirectTo(ROUTES.LOGIN, redirectPath),
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  })

  if (error) {
    try {
      sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY)
    } catch {
      // ignore
    }
    return createErrorResponse(mapAuthError(error.message), error.message)
  }

  return createSuccessResponse(null)
}

export async function logout(): Promise<ServiceResponse<null>> {
  const { error } = await supabase.auth.signOut()

  if (error) {
    return createErrorResponse('Unable to sign out.', error.message)
  }

  return createSuccessResponse(null)
}

export async function getCurrentUser(): Promise<ServiceResponse<Profile | null>> {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    return createErrorResponse(
      'Unable to verify session.',
      error.message,
    )
  }

  if (!data.session?.user) {
    return createSuccessResponse(null)
  }

  return fetchProfile(data.session.user.id)
}

export async function hasActiveSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return Boolean(data.session)
}

export interface UpdateProfileInput {
  fullName: string
  phone: string
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<ServiceResponse<Profile>> {
  const fullName = input.fullName.trim()
  const phone = input.phone.trim()

  if (!fullName) {
    return createErrorResponse('Full name is required.')
  }

  if (!isValidPhone(phone)) {
    return createErrorResponse('Phone number must be exactly 10 digits.')
  }

  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser()

  if (sessionError || !user) {
    return createErrorResponse('Please sign in to update your profile.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone,
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return createErrorResponse(mapAuthError(error.message), error.message)
  }

  return createSuccessResponse(mapProfile(data))
}

export async function updatePassword(
  newPassword: string,
): Promise<ServiceResponse<null>> {
  if (!isValidPassword(newPassword)) {
    return createErrorResponse(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    )
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return createErrorResponse(mapAuthError(error.message), error.message)
  }

  return createSuccessResponse(null)
}
