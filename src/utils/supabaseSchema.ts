import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'

/** PostgREST / Postgres errors when a column is not in the live schema yet. */
export function isMissingColumnError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    (normalized.includes('column') &&
      (normalized.includes('does not exist') ||
        normalized.includes('could not find'))) ||
    normalized.includes('schema cache')
  )
}

/** PostgREST error when a table has not been migrated yet. */
export function isMissingRelationError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    (normalized.includes('does not exist') &&
      (normalized.includes('relation') || normalized.includes('table'))) ||
    (normalized.includes('schema cache') &&
      (normalized.includes('could not find') ||
        normalized.includes('organization_customers')))
  )
}

/** Attach tenant id for SaaS schema; safe to strip on pre-migration DBs. */
export function withOrganizationId<T extends Record<string, unknown>>(
  payload: T,
  organizationId: string = DEFAULT_ORGANIZATION_ID,
): T & { organization_id: string } {
  return { ...payload, organization_id: organizationId }
}

export function withoutOrganizationId<T extends Record<string, unknown>>(
  payload: T,
): Omit<T, 'organization_id'> {
  const { organization_id: _ignored, ...rest } = payload
  return rest
}
