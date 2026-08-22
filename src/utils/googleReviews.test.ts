import { describe, expect, it } from 'vitest'
import {
  CHOPSTICKS_SPICE_MALABAR_GOOGLE_PLACE_REF,
  googleReadReviewsUrl,
  googleReviewsFromSettings,
  googleWriteReviewUrl,
  isGooglePlaceConfigured,
  isGoogleReviewsWidgetConfigured,
  isPlausibleGooglePlaceId,
  normalizeGooglePlaceRef,
  shouldShowGoogleReviewsSection,
} from './googleReviews'

describe('normalizeGooglePlaceRef', () => {
  it('keeps Place IDs and feature ids', () => {
    expect(normalizeGooglePlaceRef('ChIJabc123')).toBe('ChIJabc123')
    expect(
      normalizeGooglePlaceRef(CHOPSTICKS_SPICE_MALABAR_GOOGLE_PLACE_REF),
    ).toBe(CHOPSTICKS_SPICE_MALABAR_GOOGLE_PLACE_REF)
  })

  it('extracts feature id from a Maps place URL', () => {
    const url =
      'https://www.google.com/maps/place/Chopsticks+Spice+Malabar/@18.565348,73.9105513,17z/data=!3m1!4b1!4m6!3m5!1s0x3bc2c147612d2283:0x99931da5ee69218a!8m2!3d18.5653429!4d73.9131262'
    expect(normalizeGooglePlaceRef(url)).toBe(
      CHOPSTICKS_SPICE_MALABAR_GOOGLE_PLACE_REF,
    )
  })
})

describe('googleReviewsFromSettings', () => {
  it('reads per-org settings and ignores empty strings', () => {
    expect(
      googleReviewsFromSettings({
        google_place_id: '  ChIJabc123  ',
        google_reviews_widget_src: 'https://cdn.example.com/loader.js',
        google_reviews_widget_class: ' elfsight-app-x ',
      }),
    ).toEqual({
      placeId: 'ChIJabc123',
      widgetSrc: 'https://cdn.example.com/loader.js',
      widgetClass: 'elfsight-app-x',
    })
  })

  it('returns empty config when unset', () => {
    expect(googleReviewsFromSettings({})).toEqual({
      placeId: '',
      widgetSrc: '',
      widgetClass: '',
    })
  })
})

describe('google review URLs', () => {
  it('builds write and read links for a Place ID', () => {
    expect(googleWriteReviewUrl('ChIJabc')).toBe(
      'https://search.google.com/local/writereview?placeid=ChIJabc',
    )
    expect(googleReadReviewsUrl('ChIJabc')).toContain('placeid=ChIJabc')
    expect(googleWriteReviewUrl('')).toBe('')
  })

  it('builds write link for Chopsticks feature id', () => {
    expect(
      googleWriteReviewUrl(CHOPSTICKS_SPICE_MALABAR_GOOGLE_PLACE_REF),
    ).toContain(encodeURIComponent(CHOPSTICKS_SPICE_MALABAR_GOOGLE_PLACE_REF))
    expect(
      googleReadReviewsUrl(CHOPSTICKS_SPICE_MALABAR_GOOGLE_PLACE_REF),
    ).toContain('cid=')
  })
})

describe('google reviews visibility helpers', () => {
  it('requires place id or widget for the homepage section', () => {
    expect(
      shouldShowGoogleReviewsSection({
        placeId: '',
        widgetSrc: '',
        widgetClass: '',
      }),
    ).toBe(false)
    expect(
      isGooglePlaceConfigured({
        placeId: 'ChIJabc',
        widgetSrc: '',
        widgetClass: '',
      }),
    ).toBe(true)
    expect(
      isGoogleReviewsWidgetConfigured({
        placeId: '',
        widgetSrc: 'https://cdn.example.com/x.js',
        widgetClass: '',
      }),
    ).toBe(true)
  })

  it('validates plausible Place IDs and rejects short links', () => {
    expect(isPlausibleGooglePlaceId('')).toBe(true)
    expect(isPlausibleGooglePlaceId('ChIJN1t_tDeuEmsRUsoyG83frY4')).toBe(true)
    expect(
      isPlausibleGooglePlaceId(CHOPSTICKS_SPICE_MALABAR_GOOGLE_PLACE_REF),
    ).toBe(true)
    expect(
      isPlausibleGooglePlaceId('https://maps.app.goo.gl/J4bsJuCEnAQPrmMn7'),
    ).toBe(false)
    expect(isPlausibleGooglePlaceId('not a place')).toBe(false)
  })
})
