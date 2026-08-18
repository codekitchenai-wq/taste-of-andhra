/** Taste of Andhra public slug. Never use this as a fallback for other tenants. */
export const TASTE_OF_ANDHRA_SLUG = 'thetasteofandhra'

export function isTasteOfAndhraSlug(
  slug: string | null | undefined,
): boolean {
  if (!slug) return false
  return slug.trim().toLowerCase() === TASTE_OF_ANDHRA_SLUG
}

/** Canonical storefront slug → https://chopsticksspicemalabar.directapp.in */
export const SPICE_MALABAR_SLUG = 'chopsticksspicemalabar'

export function isSpiceMalabarSlug(
  slug: string | null | undefined,
): boolean {
  if (!slug) return false
  return slug.trim().toLowerCase() === SPICE_MALABAR_SLUG
}

/** Slugs to try when looking up this tenant. Retired host spice-malabar is not aliased. */
export function organizationSlugCandidates(slug: string): string[] {
  const key = slug.trim().toLowerCase()
  if (!key) return []
  return [key]
}
