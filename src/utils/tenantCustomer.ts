import type { Profile } from '@/types/Profile'

export interface TenantCustomerCapture {
  full_name?: string | null
  phone?: string | null
  email?: string | null
  is_active?: boolean | null
  created_at?: string | null
}

/** Overlay this restaurant's captured contact onto the login profile. */
export function applyTenantCustomerCapture(
  profile: Profile,
  capture: TenantCustomerCapture | null | undefined,
): Profile {
  if (!capture) return profile
  return {
    ...profile,
    full_name: capture.full_name?.trim() || profile.full_name,
    phone: capture.phone?.trim() || profile.phone,
    email: capture.email?.trim() || profile.email,
    is_active:
      capture.is_active === undefined || capture.is_active === null
        ? profile.is_active
        : Boolean(capture.is_active),
    created_at: capture.created_at || profile.created_at,
  }
}
