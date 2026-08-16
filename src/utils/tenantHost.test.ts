import { describe, expect, it } from 'vitest'
import {
  customDomainHostVariants,
  isPlatformHostname,
  slugFromHostname,
} from './tenantHost'

describe('slugFromHostname', () => {
  it('returns null for apex and www apex', () => {
    expect(slugFromHostname('directapp.in', 'directapp.in')).toBeNull()
    expect(slugFromHostname('www.directapp.in', 'directapp.in')).toBeNull()
    expect(slugFromHostname('localhost', 'directapp.in')).toBeNull()
  })

  it('extracts a single-label platform subdomain', () => {
    expect(
      slugFromHostname('thetasteofandhra.directapp.in', 'directapp.in'),
    ).toBe('thetasteofandhra')
  })

  it('extracts slug from www.{slug}.{root}', () => {
    expect(
      slugFromHostname('www.thetasteofandhra.directapp.in', 'directapp.in'),
    ).toBe('thetasteofandhra')
  })

  it('rejects deeper or unrelated hosts', () => {
    expect(
      slugFromHostname('a.b.thetasteofandhra.directapp.in', 'directapp.in'),
    ).toBeNull()
    expect(slugFromHostname('order.chopsticks.com', 'directapp.in')).toBeNull()
  })
})

describe('customDomainHostVariants', () => {
  it('includes www and bare host', () => {
    expect(customDomainHostVariants('www.chopsticks.com').sort()).toEqual([
      'chopsticks.com',
      'www.chopsticks.com',
    ])
    expect(customDomainHostVariants('order.chopsticks.com').sort()).toEqual([
      'order.chopsticks.com',
      'www.order.chopsticks.com',
    ])
  })
})

describe('isPlatformHostname', () => {
  it('detects platform apex and tenant hosts', () => {
    expect(isPlatformHostname('directapp.in', 'directapp.in')).toBe(true)
    expect(isPlatformHostname('www.directapp.in', 'directapp.in')).toBe(true)
    expect(
      isPlatformHostname('thetasteofandhra.directapp.in', 'directapp.in'),
    ).toBe(true)
    expect(isPlatformHostname('order.chopsticks.com', 'directapp.in')).toBe(
      false,
    )
  })
})
