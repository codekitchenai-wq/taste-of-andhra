import { describe, expect, it } from 'vitest'
import {
  buildStarterEmailInvite,
  buildWhatsAppDeepLink,
  buildStarterSeo,
  isFssaiExpired,
  isFssaiExpiringSoon,
  isWebsiteStarterTrack,
  normalizeFssaiLicense,
  proposeDisplayName,
  storefrontAccessState,
  whatsappE164Digits,
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

  it('normalizes FSSAI licence for duplicate matching', () => {
    expect(normalizeFssaiLicense('12345 67890 123')).toBe('1234567890123')
    expect(normalizeFssaiLicense('ab-12 34')).toBe('AB1234')
    expect(normalizeFssaiLicense('')).toBe('')
  })

  it('builds Indian WhatsApp deep links', () => {
    expect(whatsappE164Digits('9876543210')).toBe('919876543210')
    expect(
      buildWhatsAppDeepLink('9876543210', 'Hello').startsWith(
        'https://wa.me/919876543210?text=',
      ),
    ).toBe(true)
  })

  it('builds email invite mailto', () => {
    const email = buildStarterEmailInvite({
      displayName: 'Test Kitchen',
      setupUrl: 'https://www.directapp.in/setup/abc',
      ownerEmail: 'owner@example.com',
      temporaryPassword: 'Da-test',
    })
    expect(email.subject).toContain('Test Kitchen')
    expect(email.body).toContain('/setup/abc')
    expect(email.mailtoHref).toContain('mailto:owner%40example.com')
  })
})
