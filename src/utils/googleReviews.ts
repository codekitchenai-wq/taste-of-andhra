/** Per-restaurant Google Business Profile keys on `organizations.settings`. */
export const GOOGLE_PLACE_ID_SETTING_KEY = 'google_place_id'
export const GOOGLE_REVIEWS_WIDGET_SRC_SETTING_KEY =
  'google_reviews_widget_src'
export const GOOGLE_REVIEWS_WIDGET_CLASS_SETTING_KEY =
  'google_reviews_widget_class'

/** Chopsticks Spice Malabar (Viman Nagar) — from their Google Maps share link. */
export const CHOPSTICKS_SPICE_MALABAR_GOOGLE_PLACE_REF =
  '0x3bc2c147612d2283:0x99931da5ee69218a'

export interface GoogleReviewsConfig {
  placeId: string
  widgetSrc: string
  widgetClass: string
}

/** Parsed homepage widget mount target (class + optional SociableKIT embed id). */
export interface GoogleReviewsWidgetMount {
  className: string
  embedId: string
}

/**
 * Widget container field formats:
 * - Elfsight: `elfsight-app-xxxxxxxx`
 * - SociableKIT: `sk-ww-google-reviews|12345678` (class|embed-id)
 * - Class only: `my-widget-class`
 */
export function parseGoogleReviewsWidgetMount(
  widgetClass: string,
): GoogleReviewsWidgetMount | null {
  const trimmed = widgetClass.trim()
  if (!trimmed) return null

  const pipe = trimmed.indexOf('|')
  if (pipe > 0) {
    const className = trimmed.slice(0, pipe).trim()
    const embedId = trimmed.slice(pipe + 1).trim()
    if (!className) return null
    return { className, embedId }
  }

  return { className: trimmed, embedId: '' }
}

function settingString(
  settings: Record<string, unknown> | null | undefined,
  key: string,
): string {
  const raw = settings?.[key]
  if (typeof raw !== 'string') return ''
  return raw.trim()
}

const FEATURE_ID_RE = /0x[0-9a-fA-F]+:0x[0-9a-fA-F]+/
const PLACE_ID_RE = /ChIJ[\w-]+/

/**
 * Accepts a Place ID (`ChIJ…`), Maps feature id (`0x…:0x…`), or a Google Maps
 * place URL that contains either. Short `maps.app.goo.gl` links must be opened
 * once so Google expands them, then paste the long `maps.google.com/place/…` URL.
 */
export function normalizeGooglePlaceRef(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  if (PLACE_ID_RE.test(trimmed) && !trimmed.includes('://')) {
    const match = trimmed.match(PLACE_ID_RE)
    return match?.[0] ?? trimmed
  }

  if (FEATURE_ID_RE.test(trimmed) && !trimmed.includes('://')) {
    const match = trimmed.match(FEATURE_ID_RE)
    return match?.[0] ?? trimmed
  }

  try {
    const url = new URL(trimmed)
    const fromQuery =
      url.searchParams.get('placeid') ||
      url.searchParams.get('place_id') ||
      url.searchParams.get('query_place_id')
    if (fromQuery) {
      const nested = normalizeGooglePlaceRef(fromQuery)
      if (nested) return nested
    }

    const decoded = decodeURIComponent(url.href)
    const feature = decoded.match(FEATURE_ID_RE)
    if (feature) return feature[0]
    const place = decoded.match(PLACE_ID_RE)
    if (place) return place[0]
  } catch {
    // not a URL — fall through
  }

  const featureLoose = trimmed.match(FEATURE_ID_RE)
  if (featureLoose) return featureLoose[0]
  const placeLoose = trimmed.match(PLACE_ID_RE)
  if (placeLoose) return placeLoose[0]

  return trimmed
}

/** Reads Google review settings for the current restaurant only — never another tenant. */
export function googleReviewsFromSettings(
  settings: Record<string, unknown> | null | undefined,
): GoogleReviewsConfig {
  return {
    placeId: normalizeGooglePlaceRef(
      settingString(settings, GOOGLE_PLACE_ID_SETTING_KEY),
    ),
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
  const id = normalizeGooglePlaceRef(placeId)
  if (!id) return ''

  // `writereview?placeid=` only accepts Place IDs (ChIJ…). Feature ids from
  // Maps share links need the Maps CID + LRD write deep-link (action 3).
  if (FEATURE_ID_RE.test(id)) {
    const cid = featureIdToCidDecimal(id)
    if (!cid) return ''
    return `https://www.google.com/maps?cid=${cid}#lrd=${id},3`
  }

  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(id)}`
}

function featureIdToCidDecimal(featureId: string): string {
  const hex = featureId.split(':')[1]
  if (!hex) return ''
  try {
    return BigInt(hex).toString(10)
  } catch {
    return ''
  }
}

export function googleReadReviewsUrl(placeId: string): string {
  const id = normalizeGooglePlaceRef(placeId)
  if (!id) return ''
  if (FEATURE_ID_RE.test(id)) {
    const cid = featureIdToCidDecimal(id)
    if (!cid) return ''
    return `https://www.google.com/maps?cid=${cid}`
  }
  return `https://search.google.com/local/reviews?placeid=${encodeURIComponent(id)}`
}

/** Place ID, feature id, or empty. Maps short links alone are not accepted. */
export function isPlausibleGooglePlaceId(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (/maps\.app\.goo\.gl/i.test(trimmed)) return false
  const normalized = normalizeGooglePlaceRef(trimmed)
  if (!normalized) return false
  if (PLACE_ID_RE.test(normalized)) return true
  if (FEATURE_ID_RE.test(normalized)) return true
  return false
}
