import { MASTER_ACCOUNT } from '@/constants/DEMO_ACCOUNTS'
import type { Profile } from '@/types/Profile'
import type { UserRole } from '@/types/enums'

/**
 * True when the user is DirectApp Master (platform_master).
 * Also accepts the seeded master email while profiles.role still shows
 * `admin` (before `platform_master` is added to the Postgres enum).
 */
export function isPlatformMasterUser(
  user: Pick<Profile, 'email' | 'role'> | null | undefined,
): boolean {
  if (!user) return false
  if (user.role === 'platform_master') return true
  return (
    user.email?.toLowerCase() === MASTER_ACCOUNT.email.toLowerCase()
  )
}

export function canAccessPortal(
  userRole: UserRole | null | undefined,
  portalRole: UserRole,
  userEmail?: string | null,
): boolean {
  if (!userRole) return false
  if (userRole === portalRole) return true
  if (
    portalRole === 'platform_master' &&
    userEmail?.toLowerCase() === MASTER_ACCOUNT.email.toLowerCase()
  ) {
    return true
  }
  return false
}
