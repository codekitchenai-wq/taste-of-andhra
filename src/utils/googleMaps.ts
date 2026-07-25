const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''

export const isGoogleMapsConfigured = GOOGLE_MAPS_API_KEY.length > 0

const SCRIPT_ID = 'google-maps-js'

let loaderPromise: Promise<typeof google.maps> | null = null

/**
 * Loads the Maps JS API once per page. Concurrent callers share one promise so
 * mounting several pickers does not inject duplicate scripts.
 */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (!isGoogleMapsConfigured) {
    return Promise.reject(new Error('Google Maps API key is not configured.'))
  }

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps requires a browser.'))
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps)
  }

  if (loaderPromise) return loaderPromise

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID)

    const onLoad = () => {
      if (window.google?.maps) {
        resolve(window.google.maps)
      } else {
        reject(new Error('Google Maps failed to initialise.'))
      }
    }

    if (existing) {
      existing.addEventListener('load', onLoad)
      existing.addEventListener('error', () =>
        reject(new Error('Google Maps script failed to load.')),
      )
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY,
    )}&libraries=places&loading=async`
    script.addEventListener('load', onLoad)
    script.addEventListener('error', () => {
      loaderPromise = null
      reject(new Error('Google Maps script failed to load.'))
    })

    document.head.appendChild(script)
  })

  return loaderPromise
}

export interface ResolvedPlace {
  latitude: number
  longitude: number
  addressLine1: string
  city: string
  state: string
  pincode: string
  formattedAddress: string
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
  const sublocality =
    componentOf(components, 'sublocality_level_1') ||
    componentOf(components, 'sublocality') ||
    componentOf(components, 'neighborhood')

  const addressLine1 =
    [premise, streetNumber, route].filter(Boolean).join(' ').trim() ||
    sublocality ||
    formattedAddress.split(',')[0]?.trim() ||
    ''

  return {
    addressLine1,
    city:
      componentOf(components, 'locality') ||
      componentOf(components, 'administrative_area_level_3') ||
      componentOf(components, 'administrative_area_level_2'),
    state: componentOf(components, 'administrative_area_level_1'),
    pincode: componentOf(components, 'postal_code'),
    formattedAddress,
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

    const best = results[0]
    if (!best) return null

    return {
      latitude,
      longitude,
      ...parsePlaceComponents(
        best.address_components ?? [],
        best.formatted_address ?? '',
      ),
    }
  } catch {
    return null
  }
}
