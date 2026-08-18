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
  it('matches only the live public slug', () => {
    expect(isSpiceMalabarSlug(SPICE_MALABAR_SLUG)).toBe(true)
    expect(isSpiceMalabarSlug('spice-malabar')).toBe(false)
    expect(isSpiceMalabarSlug('thetasteofandhra')).toBe(false)
  })

  it('does not alias the retired spice-malabar host', () => {
    expect(organizationSlugCandidates('spice-malabar')).toEqual([
      'spice-malabar',
    ])
    expect(organizationSlugCandidates(SPICE_MALABAR_SLUG)).toEqual([
      SPICE_MALABAR_SLUG,
    ])
  })
})
