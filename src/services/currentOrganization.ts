import { UNMATCHED_ORGANIZATION_ID } from '@/constants/ORGANIZATION'

let currentOrganizationId: string = UNMATCHED_ORGANIZATION_ID

/** Set by OrganizationProvider after host → tenant resolution. */
export function setCurrentOrganizationId(
  organizationId: string | null | undefined,
): void {
  const id = organizationId?.trim()
  currentOrganizationId = id || UNMATCHED_ORGANIZATION_ID
}

export function getCurrentOrganizationId(): string {
  return currentOrganizationId
}

/** Null when the host has not resolved to a restaurant yet. */
export function getResolvedOrganizationId(): string | null {
  const id = currentOrganizationId.trim()
  if (!id || id === UNMATCHED_ORGANIZATION_ID) return null
  return id
}
