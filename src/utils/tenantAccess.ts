import { UNMATCHED_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import type { UserRole } from '@/types/enums'

export interface TenantAccessInput {
  role: UserRole
  organizationId: string
  memberOrgIds: string[]
  customerOrgIds: string[]
}

export interface TenantAccessResult {
  allowed: boolean
  message: string
}

const WRONG_RESTAURANT =
  'This login belongs to a different restaurant. Use that restaurant’s own demo account.'

/**
 * Staff must be organization_members of the current restaurant.
 * Seeded customers must already be enrolled here.
 * Brand-new customers (no enrollment, no staff membership) may join this restaurant.
 */
export function evaluateTenantAccess(
  input: TenantAccessInput,
): TenantAccessResult {
  if (input.role === 'platform_master') {
    return { allowed: true, message: '' }
  }

  if (
    !input.organizationId ||
    input.organizationId === UNMATCHED_ORGANIZATION_ID
  ) {
    return {
      allowed: false,
      message: 'This restaurant is not available.',
    }
  }

  if (input.role === 'admin' || input.role === 'delivery') {
    if (input.memberOrgIds.includes(input.organizationId)) {
      return { allowed: true, message: '' }
    }
    return { allowed: false, message: WRONG_RESTAURANT }
  }

  if (input.customerOrgIds.includes(input.organizationId)) {
    return { allowed: true, message: '' }
  }

  if (input.customerOrgIds.length === 0 && input.memberOrgIds.length === 0) {
    return { allowed: true, message: '' }
  }

  return { allowed: false, message: WRONG_RESTAURANT }
}
