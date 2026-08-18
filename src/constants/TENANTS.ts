/** Canonical storefront slug → https://chopsticksspicemalabar.directapp.in */
export const SPICE_MALABAR_SLUG = 'chopsticksspicemalabar'

/** Previous public slug; still resolves to the same org. */
export const SPICE_MALABAR_SLUG_ALIASES = ['spice-malabar'] as const

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

/** Slugs to try when looking up this tenant (canonical first). */
export function organizationSlugCandidates(slug: string): string[] {
  const key = slug.trim().toLowerCase()
  if (!key) return []
  if (isSpiceMalabarSlug(key)) {
    return [SPICE_MALABAR_SLUG, ...SPICE_MALABAR_SLUG_ALIASES]
  }
  return [key]
}
