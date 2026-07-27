/** Fixed UUID for Taste of Andhra — tenant #1 (see SaaS migration seed). */
export const TASTE_OF_ANDHRA_ORG_ID =
  'a0000000-0000-4000-8000-000000000001' as const

/**
 * Active organization until OrganizationContext (Phase 2) resolves membership / slug.
 * All writes to tenant-owned tables should use this.
 */
export const DEFAULT_ORGANIZATION_ID = TASTE_OF_ANDHRA_ORG_ID
