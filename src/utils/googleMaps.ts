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
  const neighborhood = componentOf(components, 'neighborhood')
  const sublocality =
    componentOf(components, 'sublocality_level_1') ||
    componentOf(components, 'sublocality') ||
    neighborhood

  const street =
    [premise, streetNumber, route].filter(Boolean).join(' ').trim()
  const addressLine1 =
    street ||
    sublocality ||
    formattedAddress.split(',')[0]?.trim() ||
    formattedAddress

  const addressLine2 = street && sublocality ? sublocality : ''
  const landmark = neighborhood || sublocality || premise

  return {
    addressLine1,
    addressLine2,
    landmark,
    city:
      componentOf(components, 'locality') ||
      componentOf(components, 'postal_town') ||
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

  const street = results.find(
    (result) =>
      result.types?.some((type) =>
        ['street_address', 'premise', 'subpremise', 'route'].includes(type),
      ) && hasPostal(result),
  )
  if (street) return street

  const withPostal = results.find(hasPostal)
  return withPostal ?? results[0]
}

function placeFromGeocodeResult(
  result: google.maps.GeocoderResult,
  latitude: number,
  longitude: number,
): ResolvedPlace {
  return {
    latitude,
    longitude,
    ...parsePlaceComponents(
      result.address_components ?? [],
      result.formatted_address ?? '',
    ),
  }
}

/** Fills in the pincode and city after the pin is dragged off the search result. */
export async function reverseGeocode(
  maps: typeof google.maps,
  latitude: number,
  longitude: number,
): Promise<ResolvedPlace | null> {
  const geocoder = new maps.Geocoder()

  try {
    const { results } = await geocoder.geocode({
      location: { lat: latitude, lng: longitude },
    })

    const best = pickBestGeocodeResult(results)
    if (!best) return null

    return placeFromGeocodeResult(best, latitude, longitude)
  } catch {
    return null
  }
}

/** Looks up a typed search like "Harsha Pride" when the customer presses Enter. */
export async function geocodeQuery(
  maps: typeof google.maps,
  query: string,
): Promise<ResolvedPlace | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const geocoder = new maps.Geocoder()

  try {
    const { results } = await geocoder.geocode({
      address: trimmed,
      componentRestrictions: { country: 'IN' },
    })

    const best = pickBestGeocodeResult(results)
    const location = best?.geometry?.location
    if (!best || !location) return null

    return placeFromGeocodeResult(best, location.lat(), location.lng())
  } catch {
    return null
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
