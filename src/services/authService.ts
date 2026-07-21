import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Profile } from '@/types/Profile'
import type { UserRole } from '@/types/enums'
import { AUTH_REDIRECT_STORAGE_KEY, MIN_PASSWORD_LENGTH } from '@/constants/AUTH'
import { ROUTES } from '@/constants/ROUTES'
import { supabase } from '@/services/supabaseClient'
import { mapProfile } from '@/utils/mapProfile'
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
    return 'This email is already registered. Sign in instead.'
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
    return createErrorResponse('Profile not found.')
  }

  const profile = mapProfile(data)

  if (!profile.is_active) {
    await supabase.auth.signOut()
    return createErrorResponse('Your account has been deactivated.')
  }

  return createSuccessResponse(profile)
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

/**
 * Start Google OAuth for customers. Redirects the browser to Google;
 * on return, Supabase restores the session and GuestRoute finishes navigation.
 */
export async function loginWithGoogle(
  redirectPath: string = ROUTES.HOME,
): Promise<ServiceResponse<null>> {
  try {
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, redirectPath)
  } catch {
    // Private browsing may block sessionStorage; fall back to home.
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${ROUTES.LOGIN}`,
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
