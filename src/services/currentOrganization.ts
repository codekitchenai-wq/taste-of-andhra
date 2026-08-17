import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'

let currentOrganizationId: string = DEFAULT_ORGANIZATION_ID

/** Set by OrganizationProvider after host → tenant resolution. */
export function setCurrentOrganizationId(
  organizationId: string | null | undefined,
): void {
  const id = organizationId?.trim()
  currentOrganizationId = id || DEFAULT_ORGANIZATION_ID
}

export function getCurrentOrganizationId(): string {
  return currentOrganizationId
}
