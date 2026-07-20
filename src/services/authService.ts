import type { ServiceResponse } from '@/types/api'
import type { Profile } from '@/types/Profile'

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

export async function registerCustomer(
  _input: RegisterInput,
): Promise<ServiceResponse<Profile>> {
  throw new Error('Not implemented')
}

export async function login(
  _input: LoginInput,
): Promise<ServiceResponse<Profile>> {
  throw new Error('Not implemented')
}

export async function logout(): Promise<ServiceResponse<null>> {
  throw new Error('Not implemented')
}

export async function getCurrentUser(): Promise<ServiceResponse<Profile | null>> {
  throw new Error('Not implemented')
}
