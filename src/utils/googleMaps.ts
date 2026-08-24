const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''

export const isGoogleMapsConfigured = GOOGLE_MAPS_API_KEY.length > 0

const SCRIPT_ID = 'google-maps-js'

let loaderPromise: Promise<typeof google.maps> | null = null

function mapsConstructorsReady(): boolean {
  return typeof window.google?.maps?.Map === 'function'
}

function injectMapsScript(): Promise<void> {
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null

  if (existing) {
    if (window.google?.maps) return Promise.resolve()

    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('Google Maps script failed to load.')),
        { once: true },
      )
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY,
    )}&libraries=places`
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error('Google Maps script failed to load.')),
      { once: true },
    )
    document.head.appendChild(script)
  })
}

/**
 * Loads the Maps JS API once per page. Concurrent callers share one promise so
 * mounting several pickers does not inject duplicate scripts.
 *
 * `loading=async` is omitted on purpose: that mode leaves `google.maps.Map`
 * undefined until `importLibrary()` runs, which shows as
 * "maps.Map is not a constructor" in the address picker.
 */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (!isGoogleMapsConfigured) {
    return Promise.reject(new Error('Google Maps API key is not configured.'))
  }

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps requires a browser.'))
  }

  if (mapsConstructorsReady()) {
    return Promise.resolve(window.google.maps)
  }

  if (loaderPromise) return loaderPromise

  loaderPromise = (async () => {
    await injectMapsScript()

    const maps = window.google?.maps
    if (!maps) {
      throw new Error('Google Maps failed to initialise.')
    }

    if (typeof maps.importLibrary === 'function') {
      await Promise.all([
        maps.importLibrary('maps'),
        maps.importLibrary('places'),
        maps.importLibrary('geocoding'),
      ])
    }

    if (!mapsConstructorsReady()) {
      throw new Error('Google Maps failed to initialise.')
    }

    return window.google.maps
  })().catch((error: unknown) => {
    loaderPromise = null
    throw error
  })

  return loaderPromise
}

export interface ResolvedPlace {
  latitude: number
  longitude: number
  addressLine1: string
  addressLine2: string
  landmark: string
  city: string
  state: string
  pincode: string
  formattedAddress: string
}

export const EMPTY_RESOLVED_PLACE: Omit<
  ResolvedPlace,
  'latitude' | 'longitude'
> = {
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  formattedAddress: '',
}

function componentOf(
  components: google.maps.GeocoderAddressComponent[],
  type: string,
): string {
  const match = components.find((component) => component.types.includes(type))
  return match?.long_name ?? ''
}

export function parsePlaceComponents(
  components: google.maps.GeocoderAddressComponent[],
  formattedAddress: string,
): Omit<ResolvedPlace, 'latitude' | 'longitude'> {
  const streetNumber = componentOf(components, 'street_number')
  const route = componentOf(components, 'route')
  const premise = componentOf(components, 'premise')
  const subpremise = componentOf(components, 'subpremise')

  // Google India rarely returns street_number for residential pins.
  // sublocality_level_2 is often the colony/layout name; sublocality_level_1
  // is the broader neighbourhood (e.g. "Baner").
  const sublocality2 = componentOf(components, 'sublocality_level_2')
  const sublocality1 = componentOf(components, 'sublocality_level_1')
  const neighborhood = componentOf(components, 'neighborhood')
  const sublocality = sublocality1 || sublocality2 || neighborhood

  // addressLine1: most specific street-level info available.
  // Prefer premise (named building) + route. If neither, use the first
  // comma-segment of the formatted address which is typically the building
  // name or street returned by Google.
  const streetParts = [subpremise, premise, streetNumber, route]
    .filter(Boolean)
    .join(', ')
    .trim()

  const firstFormattedSegment = formattedAddress.split(',')[0]?.trim() ?? ''

  const addressLine1 = streetParts || firstFormattedSegment || sublocality

  // addressLine2: area/colony, only when we already have a street in line 1.
  // Use sublocality_level_2 (colony) or sublocality_level_1 (area) as the
  // neighbourhood detail.
  const addressLine2 = streetParts
    ? (sublocality2 || sublocality1 || neighborhood)
    : ''

  // Landmark: prefer the more specific sublocality_level_2 (colony/layout)
  // so it's different from the city-level sublocality in line 1.
  const landmark = sublocality2 || neighborhood || sublocality1 || premise

  return {
    addressLine1,
    addressLine2,
    landmark,
    city:
      componentOf(components, 'locality') ||
      componentOf(components, 'administrative_area_level_3') ||
      componentOf(components, 'administrative_area_level_2'),
    state: componentOf(components, 'administrative_area_level_1'),
    pincode: componentOf(components, 'postal_code'),
    formattedAddress,
  }
}

export function pickBestGeocodeResult<
  T extends { types?: string[]; address_components?: { types: string[] }[] },
>(results: T[]): T | undefined {
  if (results.length === 0) return undefined

  const hasPostal = (result: T) =>
    result.address_components?.some((component) =>
      component.types.includes('postal_code'),
    )

  // Tier 1: street-level result that also has a pincode — most complete.
  const streetWithPostal = results.find(
    (result) =>
      result.types?.some((type) =>
        ['street_address', 'premise', 'subpremise', 'route'].includes(type),
      ) && hasPostal(result),
  )
  if (streetWithPostal) return streetWithPostal

  // Tier 2: any street-level result (no pincode — we may get it from another result).
  const street = results.find((result) =>
    result.types?.some((type) =>
      ['street_address', 'premise', 'subpremise', 'route'].includes(type),
    ),
  )

  // Tier 3: sublocality or neighbourhood result with a pincode (common in India).
  const sublocalityWithPostal = results.find(
    (result) =>
      result.types?.some((type) =>
        ['sublocality', 'neighborhood', 'political'].includes(type),
      ) && hasPostal(result),
  )

  // Prefer street over sublocality, but if neither has pincode, merge by
  // returning the street result — the caller can separately extract pincode
  // from the first result with a postal_code.
  if (street) return street
  if (sublocalityWithPostal) return sublocalityWithPostal

  const withPostal = results.find(hasPostal)
  return withPostal ?? results[0]
}

/**
 * Extracts the pincode from the first geocode result that has one.
 * Used to patch a street-level result that lacks a postal_code component.
 */
export function extractPincodeFromResults<
  T extends { address_components?: { types: string[]; long_name: string }[] },
>(results: T[]): string {
  for (const result of results) {
    const postal = result.address_components?.find((c) =>
      c.types.includes('postal_code'),
    )
    if (postal?.long_name) return postal.long_name
  }
  return ''
}

function placeFromGeocodeResult(
  result: google.maps.GeocoderResult,
  latitude: number,
  longitude: number,
): ResolvedPlace {
  const parsed = parsePlaceComponents(
    result.address_components ?? [],
    result.formatted_address ?? '',
  )
  return { latitude, longitude, ...parsed }
}

export type GeocodeLookupResult =
  | { ok: true; place: ResolvedPlace }
  | { ok: false; message: string }

function geocodeFailureMessage(error: unknown): string {
  const text =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ''

  if (/REQUEST_DENIED|ApiNotActivated|not authorized|API_KEY/i.test(text)) {
    return 'Address lookup is blocked for this Maps key. Enable Geocoding API, or type the address below.'
  }

  if (/OVER_QUERY_LIMIT|RESOURCE_EXHAUSTED/i.test(text)) {
    return 'Address lookup is temporarily limited. Type the address below, or try again shortly.'
  }

  return 'Could not look up this pin. Type your house, street, city and pincode below.'
}

/** Fills in the pincode and city after the pin is dragged off the search result. */
export async function reverseGeocode(
  maps: typeof google.maps,
  latitude: number,
  longitude: number,
): Promise<GeocodeLookupResult> {
  const geocoder = new maps.Geocoder()

  try {
    const { results } = await geocoder.geocode({
      location: { lat: latitude, lng: longitude },
    })

    const best = pickBestGeocodeResult(results)
    if (!best) {
      return {
        ok: false,
        message:
          'No address found for this pin. Type your house, street, city and pincode below.',
      }
    }

    const place = placeFromGeocodeResult(best, latitude, longitude)

    // If the best result has no pincode, try to pull it from any other result
    // that does — Google frequently puts the postal_code on a separate entry.
    if (!place.pincode) {
      place.pincode = extractPincodeFromResults(results)
    }

    return { ok: true, place }
  } catch (error: unknown) {
    return { ok: false, message: geocodeFailureMessage(error) }
  }
}

/** Looks up a typed search like "Harsha Pride" when the customer presses Enter. */
export async function geocodeQuery(
  maps: typeof google.maps,
  query: string,
): Promise<GeocodeLookupResult> {
  const trimmed = query.trim()
  if (!trimmed) {
    return { ok: false, message: 'Enter a place name to search.' }
  }

  const geocoder = new maps.Geocoder()

  try {
    const { results } = await geocoder.geocode({
      address: trimmed,
      componentRestrictions: { country: 'IN' },
    })

    const best = pickBestGeocodeResult(results)
    const location = best?.geometry?.location
    if (!best || !location) {
      return {
        ok: false,
        message:
          'We could not find that place. Pick a suggestion from the list or tap the map.',
      }
    }

    return {
      ok: true,
      place: placeFromGeocodeResult(best, location.lat(), location.lng()),
    }
  } catch (error: unknown) {
    return { ok: false, message: geocodeFailureMessage(error) }
  }
}

export function mergeResolvedPlaces(
  primary: ResolvedPlace | null,
  fallback: ResolvedPlace,
): ResolvedPlace {
  if (!primary) return fallback

  return {
    latitude: primary.latitude || fallback.latitude,
    longitude: primary.longitude || fallback.longitude,
    addressLine1: primary.addressLine1 || fallback.addressLine1,
    addressLine2: primary.addressLine2 || fallback.addressLine2,
    landmark: primary.landmark || fallback.landmark,
    city: primary.city || fallback.city,
    state: primary.state || fallback.state,
    pincode: primary.pincode || fallback.pincode,
    formattedAddress: primary.formattedAddress || fallback.formattedAddress,
  }
}
