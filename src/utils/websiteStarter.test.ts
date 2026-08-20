import { describe, expect, it } from 'vitest'
import {
  buildStarterSeo,
  isFssaiExpired,
  isFssaiExpiringSoon,
  isWebsiteStarterTrack,
  proposeDisplayName,
  storefrontAccessState,
} from '@/utils/websiteStarter'
import { WEBSITE_STARTER_PLAN_CODE } from '@/constants/ONBOARDING'

describe('websiteStarter helpers', () => {
  it('detects website_starter product track', () => {
    expect(isWebsiteStarterTrack({ product_track: WEBSITE_STARTER_PLAN_CODE })).toBe(
      true,
    )
    expect(isWebsiteStarterTrack({})).toBe(false)
  })

  it('prefers preferred store name over legal name', () => {
    expect(proposeDisplayName('LEGAL PVT LTD', 'Spice House')).toBe(
      'Spice House',
    )
    expect(proposeDisplayName('LEGAL PVT LTD')).toBe('LEGAL PVT LTD')
  })

  it('gates storefront for pending and expired FSSAI on starter', () => {
    expect(
      storefrontAccessState({
        status: 'trialing',
        onboardingStatus: 'pending_setup',
        settings: { product_track: WEBSITE_STARTER_PLAN_CODE },
        fssaiValidUntil: '2099-01-01',
      }),
    ).toBe('pending_setup')

    expect(
      storefrontAccessState({
        status: 'active',
        onboardingStatus: 'live',
        settings: {
          product_track: WEBSITE_STARTER_PLAN_CODE,
          fssai_enforcement: true,
        },
        fssaiValidUntil: '2020-01-01',
      }),
    ).toBe('fssai_expired')

    expect(
      storefrontAccessState({
        status: 'active',
        onboardingStatus: null,
        settings: {},
        fssaiValidUntil: '2020-01-01',
      }),
    ).toBe('ok')
  })

  it('builds SEO title with city', () => {
    const seo = buildStarterSeo({
      name: 'Chopsticks Spice Malabar',
      city: 'Pune',
      cuisine: 'Malabar Restaurant',
    })
    expect(seo.title).toContain('Pune')
    expect(seo.description.toLowerCase()).toContain('menu')
  })

  it('detects FSSAI expiry windows', () => {
    expect(isFssaiExpired('2020-01-01')).toBe(true)
    expect(isFssaiExpired('2099-12-31')).toBe(false)
    expect(isFssaiExpiringSoon('2099-12-31')).toBe(false)
  })
})
