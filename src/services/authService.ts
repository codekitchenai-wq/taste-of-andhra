import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Profile } from '@/types/Profile'
import { supabase } from '@/services/supabaseClient'
import { mapProfile } from '@/utils/mapProfile'
import { isValidEmail, isValidPassword, isValidPhone } from '@/utils/validation'

export interface RegisterInput {
  fullName: string
  email: string
  password: string
  phone: string
}

export interface LoginInput {
  email: string
  password: string
}

function mapAuthError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Invalid email or password.'
  }

  if (normalized.includes('user already registered')) {
    return 'An account with this email already exists.'
  }

  if (normalized.includes('duplicate key') && normalized.includes('phone')) {
    return 'This phone number is already registered.'
  }

  if (normalized.includes('duplicate key') && normalized.includes('email')) {
    return 'This email is already registered.'
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

export async function registerCustomer(
  input: RegisterInput,
): Promise<ServiceResponse<Profile>> {
  const fullName = input.fullName.trim()
  const email = input.email.trim().toLowerCase()
  const phone = input.phone.trim()

  if (!fullName) {
    return createErrorResponse('Full name is required.')
  }

  if (!isValidEmail(email)) {
    return createErrorResponse('Please enter a valid email address.')
  }

  if (!isValidPhone(phone)) {
    return createErrorResponse('Phone number must be exactly 10 digits.')
  }

  if (!isValidPassword(input.password)) {
    return createErrorResponse('Password must be at least 8 characters.')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        full_name: fullName,
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
    return createSuccessResponse({
      id: data.user.id,
      full_name: fullName,
      email,
      phone,
      role: 'customer',
      avatar_url: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  return fetchProfile(data.user.id)
}

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
