import { describe, expect, it } from 'vitest'
import {
  googleReadReviewsUrl,
  googleReviewsFromSettings,
  googleWriteReviewUrl,
  isGooglePlaceConfigured,
  isGoogleReviewsWidgetConfigured,
  isPlausibleGooglePlaceId,
  shouldShowGoogleReviewsSection,
} from './googleReviews'

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

  it('validates plausible Place IDs', () => {
    expect(isPlausibleGooglePlaceId('')).toBe(true)
    expect(isPlausibleGooglePlaceId('ChIJN1t_tDeuEmsRUsoyG83frY4')).toBe(true)
    expect(isPlausibleGooglePlaceId('not a place')).toBe(false)
  })
})
