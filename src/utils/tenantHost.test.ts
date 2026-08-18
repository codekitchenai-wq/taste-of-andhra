import { describe, expect, it } from 'vitest'
import {
  customDomainHostVariants,
  hostServesTenant,
  isOAuthCallbackHost,
  isPlatformHostname,
  slugFromHostname,
  slugFromSearchParams,
} from './tenantHost'

describe('slugFromHostname', () => {
  it('returns null for apex and www apex', () => {
    expect(slugFromHostname('directapp.in', 'directapp.in')).toBeNull()
    expect(slugFromHostname('www.directapp.in', 'directapp.in')).toBeNull()
    expect(slugFromHostname('localhost', 'directapp.in')).toBeNull()
  })

  it('extracts a local Vite subdomain without a hosts file', () => {
    expect(slugFromHostname('spice-malabar.localhost', 'directapp.in')).toBe(
      'spice-malabar',
    )
    expect(
      slugFromHostname('www.spice-malabar.localhost', 'directapp.in'),
    ).toBe('spice-malabar')
    expect(
      slugFromHostname('chopsticksspicemalabar.localhost', 'directapp.in'),
    ).toBe('chopsticksspicemalabar')
  })

  it('extracts the Chopsticks Spice Malabar production subdomain', () => {
    expect(
      slugFromHostname('chopsticksspicemalabar.directapp.in', 'directapp.in'),
    ).toBe('chopsticksspicemalabar')
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

describe('slugFromSearchParams', () => {
  it('reads tenant on localhost and platform subdomains', () => {
    expect(
      slugFromSearchParams('?tenant=spice-malabar', 'localhost'),
    ).toBe('spice-malabar')
    expect(slugFromSearchParams('?org=spice-malabar', '127.0.0.1')).toBe(
      'spice-malabar',
    )
    expect(
      slugFromSearchParams('?tenant=spice-malabar', 'thetasteofandhra.directapp.in'),
    ).toBe('spice-malabar')
    expect(
      slugFromSearchParams('?tenant=spice-malabar', 'order.chopsticks.com'),
    ).toBeNull()
    expect(
      slugFromSearchParams(
        '?tenant=chopsticksspicemalabar',
        'www.thetasteofandhra.com',
      ),
    ).toBe('chopsticksspicemalabar')
  })
})

describe('hostServesTenant', () => {
  it('matches platform subdomains and Taste of Andhra custom domains', () => {
    expect(
      hostServesTenant('chopsticksspicemalabar.directapp.in', 'chopsticksspicemalabar'),
    ).toBe(true)
    expect(
      hostServesTenant('www.thetasteofandhra.com', 'thetasteofandhra'),
    ).toBe(true)
    expect(
      hostServesTenant('www.thetasteofandhra.com', 'chopsticksspicemalabar'),
    ).toBe(false)
  })
})

describe('isOAuthCallbackHost', () => {
  it('treats the platform apex and Taste of Andhra custom domain as callbacks', () => {
    expect(isOAuthCallbackHost('www.directapp.in')).toBe(true)
    expect(isOAuthCallbackHost('directapp.in')).toBe(true)
    expect(isOAuthCallbackHost('www.thetasteofandhra.com')).toBe(true)
    expect(isOAuthCallbackHost('chopsticksspicemalabar.directapp.in')).toBe(
      false,
    )
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
