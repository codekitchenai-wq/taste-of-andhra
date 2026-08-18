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

/** Common mistype of the live host (one “s”). spice-malabar is retired. */
export const SPICE_MALABAR_SLUG_ALIASES = ['chopstickspicemalabar'] as const

const SPICE_MALABAR_SLUG_SET = new Set<string>([
  SPICE_MALABAR_SLUG,
  ...SPICE_MALABAR_SLUG_ALIASES,
])

export function isSpiceMalabarSlug(
  slug: string | null | undefined,
): boolean {
  if (!slug) return false
  return SPICE_MALABAR_SLUG_SET.has(slug.trim().toLowerCase())
}

/** DB lookup slugs. Aliases map to the canonical org row. */
export function organizationSlugCandidates(slug: string): string[] {
  const key = slug.trim().toLowerCase()
  if (!key) return []
  if (isSpiceMalabarSlug(key)) return [SPICE_MALABAR_SLUG]
  return [key]
}
