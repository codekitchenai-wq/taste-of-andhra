import { describe, expect, it } from 'vitest'
import {
  isSpiceMalabarSlug,
  organizationSlugCandidates,
  SPICE_MALABAR_SLUG,
} from './TENANTS'

describe('Spice Malabar slugs', () => {
  it('treats canonical and legacy slugs as the same tenant', () => {
    expect(isSpiceMalabarSlug(SPICE_MALABAR_SLUG)).toBe(true)
    expect(isSpiceMalabarSlug('spice-malabar')).toBe(true)
    expect(isSpiceMalabarSlug('thetasteofandhra')).toBe(false)
  })

  it('looks up either hostname slug against the same org', () => {
    expect(organizationSlugCandidates('spice-malabar')).toContain(
      SPICE_MALABAR_SLUG,
    )
    expect(organizationSlugCandidates(SPICE_MALABAR_SLUG)).toEqual(
      organizationSlugCandidates('spice-malabar'),
    )
  })
})
