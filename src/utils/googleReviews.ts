/** Per-restaurant Google Business Profile keys on `organizations.settings`. */
export const GOOGLE_PLACE_ID_SETTING_KEY = 'google_place_id'
export const GOOGLE_REVIEWS_WIDGET_SRC_SETTING_KEY =
  'google_reviews_widget_src'
export const GOOGLE_REVIEWS_WIDGET_CLASS_SETTING_KEY =
  'google_reviews_widget_class'

export interface GoogleReviewsConfig {
  placeId: string
  widgetSrc: string
  widgetClass: string
}

function settingString(
  settings: Record<string, unknown> | null | undefined,
  key: string,
): string {
  const raw = settings?.[key]
  if (typeof raw !== 'string') return ''
  return raw.trim()
}

/** Reads Google review settings for the current restaurant only — never another tenant. */
export function googleReviewsFromSettings(
  settings: Record<string, unknown> | null | undefined,
): GoogleReviewsConfig {
  return {
    placeId: settingString(settings, GOOGLE_PLACE_ID_SETTING_KEY),
    widgetSrc: settingString(settings, GOOGLE_REVIEWS_WIDGET_SRC_SETTING_KEY),
    widgetClass: settingString(
      settings,
      GOOGLE_REVIEWS_WIDGET_CLASS_SETTING_KEY,
    ),
  }
}

export function isGooglePlaceConfigured(config: GoogleReviewsConfig): boolean {
  return config.placeId.length > 0
}

export function isGoogleReviewsWidgetConfigured(
  config: GoogleReviewsConfig,
): boolean {
  return config.widgetSrc.length > 0
}

/** True when the homepage should show a Google reviews section for this org. */
export function shouldShowGoogleReviewsSection(
  config: GoogleReviewsConfig,
): boolean {
  return (
    isGoogleReviewsWidgetConfigured(config) || isGooglePlaceConfigured(config)
  )
}

/** Opens Google’s review composer for this restaurant’s listing. */
export function googleWriteReviewUrl(placeId: string): string {
  const id = placeId.trim()
  if (!id) return ''
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(id)}`
}

export function googleReadReviewsUrl(placeId: string): string {
  const id = placeId.trim()
  if (!id) return ''
  return `https://search.google.com/local/reviews?placeid=${encodeURIComponent(id)}`
}

/** Basic Place ID shape check (Google IDs typically start with ChIJ…). */
export function isPlausibleGooglePlaceId(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  return /^ChIJ[\w-]+$/.test(trimmed) || /^[A-Za-z0-9_-]{10,}$/.test(trimmed)
}
