import { describe, expect, it } from 'vitest'
import { isPlatformApexHostname } from './platformHost'

describe('isPlatformApexHostname', () => {
  it('matches apex and www apex only', () => {
    expect(isPlatformApexHostname('directapp.in', 'directapp.in')).toBe(true)
    expect(isPlatformApexHostname('www.directapp.in', 'directapp.in')).toBe(
      true,
    )
    expect(
      isPlatformApexHostname('thetasteofandhra.directapp.in', 'directapp.in'),
    ).toBe(false)
    expect(isPlatformApexHostname('www.thetasteofandhra.com', 'directapp.in')).toBe(
      false,
    )
  })
})
