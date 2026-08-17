import { describe, expect, it } from 'vitest'
import { isPlatformApexHostname, isPlatformMarketingHost } from './platformHost'

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

describe('isPlatformMarketingHost', () => {
  it('does not use the marketing site for a tenant localhost host', () => {
    expect(isPlatformMarketingHost('spice-malabar.localhost', '')).toBe(false)
  })

  it('does not use the marketing site for a local tenant query', () => {
    expect(
      isPlatformMarketingHost('localhost', '?tenant=spice-malabar'),
    ).toBe(false)
  })
})
