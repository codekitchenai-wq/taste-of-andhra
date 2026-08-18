import { describe, expect, it } from 'vitest'
import {
  isSpiceMalabarSlug,
  isTasteOfAndhraSlug,
  organizationSlugCandidates,
  SPICE_MALABAR_SLUG,
  TASTE_OF_ANDHRA_SLUG,
} from './TENANTS'

describe('Taste of Andhra slug', () => {
  it('matches only the Andhra public slug', () => {
    expect(isTasteOfAndhraSlug(TASTE_OF_ANDHRA_SLUG)).toBe(true)
    expect(isTasteOfAndhraSlug('chopsticksspicemalabar')).toBe(false)
  })
})

describe('Spice Malabar slugs', () => {
  it('matches the live slug and the one-s host typo', () => {
    expect(isSpiceMalabarSlug(SPICE_MALABAR_SLUG)).toBe(true)
    expect(isSpiceMalabarSlug('chopstickspicemalabar')).toBe(true)
    expect(isSpiceMalabarSlug('spice-malabar')).toBe(false)
    expect(isSpiceMalabarSlug('thetasteofandhra')).toBe(false)
  })

  it('looks up aliases against the canonical org slug', () => {
    expect(organizationSlugCandidates('chopstickspicemalabar')).toEqual([
      SPICE_MALABAR_SLUG,
    ])
    expect(organizationSlugCandidates(SPICE_MALABAR_SLUG)).toEqual([
      SPICE_MALABAR_SLUG,
    ])
    expect(organizationSlugCandidates('spice-malabar')).toEqual([
      'spice-malabar',
    ])
  })
})
