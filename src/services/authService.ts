import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Profile } from '@/types/Profile'
import { OTP_LENGTH } from '@/constants/AUTH'
import { supabase } from '@/services/supabaseClient'
import { mapProfile } from '@/utils/mapProfile'
import {
  normalizeIndianPhone,
  toE164IndianPhone,
} from '@/utils/phone'
import { isValidEmail, isValidPassword, isValidPhone } from '@/utils/validation'

/** Admin email/password login only */
export interface LoginInput {
  email: string
  password: string
}

export interface SendOtpInput {
  phone: string
  fullName?: string
}

export interface VerifyOtpInput {
  phone: string
  otp: string
  fullName?: string
}

function mapAuthError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Invalid email or password.'
  }

  if (
    normalized.includes('token has expired') ||
    normalized.includes('otp expired')
  ) {
    return 'OTP has expired. Please request a new one.'
  }

  if (
    normalized.includes('invalid otp') ||
    normalized.includes('invalid token')
  ) {
    return 'Invalid OTP. Please check and try again.'
  }

  if (normalized.includes('user already registered')) {
    return 'This phone number is already registered.'
  }

  if (normalized.includes('duplicate key') && normalized.includes('phone')) {
    return 'This phone number is already registered.'
  }

  if (normalized.includes('duplicate key') && normalized.includes('email')) {
    return 'This email is already registered.'
  }

  if (normalized.includes('sms send failed') || normalized.includes('phone provider')) {
    return 'Unable to send OTP. Check Supabase phone auth settings.'
  }

  if (normalized.includes('signups not allowed for otp')) {
    return 'New registrations are disabled. Contact support.'
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

async function ensureProfileDetails(
  userId: string,
  input: { fullName?: string; phone: string },
): Promise<ServiceResponse<Profile>> {
  const normalizedPhone = normalizeIndianPhone(input.phone)

  if (!normalizedPhone) {
    return createErrorResponse('Invalid phone number.')
  }

  const updates: Record<string, string> = {
    phone: normalizedPhone,
  }

  if (input.fullName?.trim()) {
    updates.full_name = input.fullName.trim()
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) {
    return createErrorResponse(
      'Signed in, but unable to save profile details.',
      error.message,
    )
  }

  return fetchProfile(userId)
}

export async function sendPhoneOtp(
  input: SendOtpInput,
): Promise<ServiceResponse<null>> {
  const normalizedPhone = normalizeIndianPhone(input.phone)

  if (!normalizedPhone) {
    return createErrorResponse('Phone number must be exactly 10 digits.')
  }

  const fullName = input.fullName?.trim()

  if (fullName !== undefined && fullName.length < 2) {
    return createErrorResponse('Full name must be at least 2 characters.')
  }

  let e164Phone: string

  try {
    e164Phone = toE164IndianPhone(normalizedPhone)
  } catch {
    return createErrorResponse('Invalid phone number.')
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: e164Phone,
    options: {
      data: {
        full_name: fullName,
        phone: normalizedPhone,
      },
    },
  })

  if (error) {
    return createErrorResponse(mapAuthError(error.message), error.message)
  }

  return createSuccessResponse(null)
}

export async function verifyPhoneOtp(
  input: VerifyOtpInput,
): Promise<ServiceResponse<Profile>> {
  const normalizedPhone = normalizeIndianPhone(input.phone)
  const otp = input.otp.trim()

  if (!normalizedPhone) {
    return createErrorResponse('Phone number must be exactly 10 digits.')
  }

  if (!/^\d+$/.test(otp) || otp.length !== OTP_LENGTH) {
    return createErrorResponse(`Enter the ${OTP_LENGTH}-digit OTP.`)
  }

  let e164Phone: string

  try {
    e164Phone = toE164IndianPhone(normalizedPhone)
  } catch {
    return createErrorResponse('Invalid phone number.')
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: e164Phone,
    token: otp,
    type: 'sms',
  })

  if (error) {
    return createErrorResponse(mapAuthError(error.message), error.message)
  }

  if (!data.user) {
    return createErrorResponse('Verification failed. Please try again.')
  }

  return ensureProfileDetails(data.user.id, {
    fullName: input.fullName,
    phone: normalizedPhone,
  })
}

/** Email/password login — used for admin accounts */
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
    return createErrorResponse('Password must be at least 8 characters.')
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return createErrorResponse(mapAuthError(error.message), error.message)
  }

  return createSuccessResponse(null)
}
