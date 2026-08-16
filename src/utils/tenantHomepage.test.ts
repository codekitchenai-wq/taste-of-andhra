import { describe, expect, it } from 'vitest'
import {
  homepageFromOrgRow,
  isValidHostname,
  normalizeHostname,
  platformSubdomainUrl,
  resolveTenantHomepage,
} from './tenantHomepage'

describe('platformSubdomainUrl', () => {
  it('builds a subdomain from the slug', () => {
    expect(platformSubdomainUrl('Chopsticks')).toBe(
      'https://chopsticks.directapp.in',
    )
  })
})

describe('normalizeHostname', () => {
  it('strips protocol and path', () => {
    expect(normalizeHostname('https://Order.Chopsticks.com/menu')).toBe(
      'order.chopsticks.com',
    )
  })
})

describe('isValidHostname', () => {
  it('accepts real domains and localhost', () => {
    expect(isValidHostname('order.chopsticks.com')).toBe(true)
    expect(isValidHostname('chopsticks.localhost')).toBe(true)
  })

  it('rejects junk', () => {
    expect(isValidHostname('not a domain')).toBe(false)
    expect(isValidHostname('chopsticks')).toBe(false)
  })
})

describe('resolveTenantHomepage', () => {
  it('uses the platform subdomain', () => {
    const result = resolveTenantHomepage('chopsticks', {
      mode: 'platform_subdomain',
      customDomain: '',
      externalUrl: '',
    })
    expect(result.error).toBeNull()
    expect(result.homepage.homepageUrl).toBe(
      'https://chopsticks.directapp.in',
    )
  })

  it('uses a custom domain', () => {
    const result = resolveTenantHomepage('chopsticks', {
      mode: 'custom_domain',
      customDomain: 'www.chopsticks.restaurant',
      externalUrl: '',
    })
    expect(result.error).toBeNull()
    expect(result.homepage.customDomain).toBe('www.chopsticks.restaurant')
    expect(result.homepage.homepageUrl).toBe(
      'https://www.chopsticks.restaurant',
    )
  })

  it('allows skipping until later', () => {
    const result = resolveTenantHomepage('chopsticks', {
      mode: 'set_later',
      customDomain: 'order.chopsticks.com',
      externalUrl: 'https://example.com',
    })
    expect(result.error).toBeNull()
    expect(result.homepage.mode).toBe('set_later')
    expect(result.homepage.homepageUrl).toBe('')
    expect(result.homepage.customDomain).toBeNull()
  })

  it('uses any other homepage link', () => {
    const result = resolveTenantHomepage('chopsticks', {
      mode: 'external_link',
      customDomain: '',
      externalUrl: 'instagram.com/chopsticksblr',
    })
    expect(result.error).toBeNull()
    expect(result.homepage.homepageUrl).toBe(
      'https://instagram.com/chopsticksblr',
    )
  })
})

describe('homepageFromOrgRow', () => {
  it('falls back to settings when columns are empty', () => {
    const homepage = homepageFromOrgRow({
      slug: 'chopsticks',
      settings: {
        homepage: {
          mode: 'external_link',
          homepage_url: 'https://linktr.ee/chopsticks',
        },
      },
    })
    expect(homepage.homepageUrl).toBe('https://linktr.ee/chopsticks')
    expect(homepage.mode).toBe('external_link')
  })

  it('keeps homepage empty when set later', () => {
    const homepage = homepageFromOrgRow({
      slug: 'chopsticks',
      homepage_mode: 'set_later',
      homepage_url: null,
    })
    expect(homepage.mode).toBe('set_later')
    expect(homepage.homepageUrl).toBe('')
  })
})
