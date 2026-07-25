const PLACE_ID = import.meta.env.VITE_GOOGLE_PLACE_ID?.trim() ?? ''
const WIDGET_SRC = import.meta.env.VITE_GOOGLE_REVIEWS_WIDGET_SRC?.trim() ?? ''
const WIDGET_CONTAINER_CLASS =
  import.meta.env.VITE_GOOGLE_REVIEWS_WIDGET_CLASS?.trim() ?? ''

export const isGoogleReviewsConfigured = PLACE_ID.length > 0
export const isGoogleReviewsWidgetConfigured = WIDGET_SRC.length > 0

export const googleReviewsWidget = {
  src: WIDGET_SRC,
  containerClass: WIDGET_CONTAINER_CLASS,
} as const

/** Opens the Google review composer for our listing, pre-selected. */
export const googleWriteReviewUrl = isGoogleReviewsConfigured
  ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(PLACE_ID)}`
  : ''

export const googleReadReviewsUrl = isGoogleReviewsConfigured
  ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(PLACE_ID)}`
  : ''
