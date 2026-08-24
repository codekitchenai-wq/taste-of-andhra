import { useCallback, useEffect, useRef, useState } from 'react'
import { Crosshair, MapPin, PenLine, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  EMPTY_RESOLVED_PLACE,
  geocodeQuery,
  isGoogleMapsConfigured,
  loadGoogleMaps,
  mergeResolvedPlaces,
  parsePlaceComponents,
  reverseGeocode,
  type ResolvedPlace,
} from '@/utils/googleMaps'
import { cn } from '@/utils/cn'

export type LocationMode = 'search' | 'auto' | 'manual'

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  onChange: (place: ResolvedPlace) => void
  required?: boolean
  error?: string
  /** When true, kick off auto-detect once the map is ready (new address). */
  autoLocateOnMount?: boolean
  /** Initial mode. Defaults to 'search'. */
  initialMode?: LocationMode
}

// Centred on India so the first view is useful before a pin is dropped.
const FALLBACK_CENTER = { lat: 20.5937, lng: 78.9629 }
const FALLBACK_ZOOM = 5
const PINNED_ZOOM = 17

const MODE_TABS: { id: LocationMode; label: string; Icon: React.ElementType }[] = [
  { id: 'search', label: 'Search location', Icon: Search },
  { id: 'auto', label: 'Auto-detect', Icon: Crosshair },
  { id: 'manual', label: 'Enter manually', Icon: PenLine },
]

export function LocationPicker({
  latitude,
  longitude,
  onChange,
  required = false,
  error,
  autoLocateOnMount = false,
  initialMode = 'search',
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const mapsRef = useRef<typeof google.maps | null>(null)
  const didAutoLocateRef = useRef(false)

  const [mode, setMode] = useState<LocationMode>(initialMode)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  // Held in refs so the map's listeners, registered once, never read stale
  // props. Re-creating the map on every render would drop the user's pin.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const initialPositionRef = useRef({ latitude, longitude })
  const lookupSearchQueryRef = useRef<(query: string) => Promise<void>>(
    async () => {},
  )

  const commitPosition = useCallback(
    async (lat: number, lng: number, known?: ResolvedPlace) => {
      const maps = mapsRef.current
      if (!maps) return

      markerRef.current?.setVisible(true)
      markerRef.current?.setPosition({ lat, lng })
      mapRef.current?.panTo({ lat, lng })
      mapRef.current?.setZoom(PINNED_ZOOM)

      setIsLookingUp(true)
      const lookup = await reverseGeocode(maps, lat, lng)
      setIsLookingUp(false)

      const fallback: ResolvedPlace = known ?? {
        latitude: lat,
        longitude: lng,
        ...EMPTY_RESOLVED_PLACE,
      }

      const merged = mergeResolvedPlaces(
        lookup.ok
          ? { ...lookup.place, latitude: lat, longitude: lng }
          : null,
        { ...fallback, latitude: lat, longitude: lng },
      )

      if (!lookup.ok && !merged.addressLine1 && !merged.city && !merged.pincode) {
        setLoadError(lookup.message)
      } else {
        setLoadError(null)
      }

      onChangeRef.current(merged)
    },
    [],
  )

  useEffect(() => {
    if (!isGoogleMapsConfigured) return
    if (mode === 'manual') return

    let cancelled = false

    void loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapContainerRef.current) return

        // Strict Mode remounts can leave a half-initialised map in the same
        // container; clear it before creating a fresh instance.
        mapContainerRef.current.innerHTML = ''
        mapsRef.current = maps

        const { latitude: initialLat, longitude: initialLng } =
          initialPositionRef.current
        const hasPin = initialLat !== null && initialLng !== null
        const center = hasPin
          ? { lat: initialLat, lng: initialLng }
          : FALLBACK_CENTER

        const map = new maps.Map(mapContainerRef.current, {
          center,
          zoom: hasPin ? PINNED_ZOOM : FALLBACK_ZOOM,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        })

        const MarkerClass = maps.Marker as typeof google.maps.Marker | undefined
        if (!MarkerClass) {
          setLoadError('Map marker library failed to load. Try refreshing.')
          return
        }
        const marker = new MarkerClass({
          map,
          position: center,
          draggable: true,
          visible: hasPin,
        })

        mapRef.current = map
        markerRef.current = marker
        setMapReady(true)

        marker.addListener('dragend', () => {
          const position = marker.getPosition()
          if (!position) return
          void commitPosition(position.lat(), position.lng())
        })

        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return
          marker.setVisible(true)
          void commitPosition(event.latLng.lat(), event.latLng.lng())
        })

        if (searchInputRef.current) {
          const PlacesAutocomplete = maps.places?.Autocomplete as
            | (new (
                input: HTMLInputElement,
                opts?: google.maps.places.AutocompleteOptions,
              ) => google.maps.places.Autocomplete)
            | undefined

          if (PlacesAutocomplete) {
            try {
              const autocomplete = new PlacesAutocomplete(searchInputRef.current, {
                componentRestrictions: { country: 'in' },
                fields: ['address_components', 'geometry', 'formatted_address', 'name'],
              })

              autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace()
                const location = place.geometry?.location

                if (!location) {
                  const query = searchInputRef.current?.value?.trim()
                  if (query) void lookupSearchQueryRef.current(query)
                  return
                }

                void commitPosition(location.lat(), location.lng(), {
                  latitude: location.lat(),
                  longitude: location.lng(),
                  ...parsePlaceComponents(
                    place.address_components ?? [],
                    place.formatted_address || place.name || '',
                  ),
                })
              })
            } catch {
              // Autocomplete unavailable — Enter-to-geocode still works
            }
          }
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load the map.',
        )
      })

    return () => {
      cancelled = true
      setMapReady(false)
      markerRef.current = null
      mapRef.current = null
      mapsRef.current = null
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = ''
      }
    }
  }, [commitPosition, mode])

  // Reflect coordinates supplied by the parent, e.g. when editing an address.
  useEffect(() => {
    if (latitude === null || longitude === null) return
    const marker = markerRef.current
    const map = mapRef.current
    if (!marker || !map) return

    marker.setVisible(true)
    marker.setPosition({ lat: latitude, lng: longitude })
    map.panTo({ lat: latitude, lng: longitude })
  }, [latitude, longitude])

  const lookupSearchQuery = async (query: string) => {
    const maps = mapsRef.current
    if (!maps || !query.trim()) return

    setIsLookingUp(true)
    const lookup = await geocodeQuery(maps, query)
    setIsLookingUp(false)

    if (!lookup.ok) {
      setLoadError(lookup.message)
      return
    }

    setLoadError(null)
    await commitPosition(
      lookup.place.latitude,
      lookup.place.longitude,
      lookup.place,
    )
  }

  lookupSearchQueryRef.current = lookupSearchQuery

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    void lookupSearchQuery(event.currentTarget.value)
  }

  const triggerSearchFromInput = () => {
    const query = searchInputRef.current?.value?.trim() ?? ''
    if (!query) return
    void lookupSearchQuery(query)
  }

  const handleSearchBlur = () => {
    const input = searchInputRef.current
    if (!input) return
    if (!input.value.trim()) return
    window.setTimeout(() => {
      triggerSearchFromInput()
    }, 100)
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLoadError('This browser cannot share your location.')
      return
    }

    if (!mapsRef.current) {
      setLoadError('Wait for the map to load, then try again.')
      return
    }

    setLoadError(null)
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false)
        void commitPosition(
          position.coords.latitude,
          position.coords.longitude,
        )
      },
      (geoError) => {
        setIsLocating(false)
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setLoadError(
            'Location permission was blocked. Allow location for this site in your browser settings, then try again.',
          )
          return
        }
        setLoadError(
          'Could not read your GPS. Try searching for your area or tap the map instead.',
        )
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // Auto-detect on mount (when autoLocateOnMount is true and mode is 'auto').
  useEffect(() => {
    if (!autoLocateOnMount || !mapReady || didAutoLocateRef.current) return
    if (latitude !== null && longitude !== null) return
    if (mode !== 'auto') return
    didAutoLocateRef.current = true
    handleUseMyLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocateOnMount, mapReady, latitude, longitude, mode])

  const handleModeChange = (newMode: LocationMode) => {
    setMode(newMode)
    setLoadError(null)
    // When switching to auto mode, reset the auto-locate guard so it can fire.
    if (newMode === 'auto') {
      didAutoLocateRef.current = false
    }
  }

  if (!isGoogleMapsConfigured) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-warning/40 bg-warning/5 p-4 text-sm text-text-secondary">
        Map pin is unavailable on this site. You can still type your address in the fields below.
        Delivery distance and shipping may be less accurate until maps are enabled.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {MODE_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleModeChange(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all',
              mode === id
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">
              {id === 'search' ? 'Search' : id === 'auto' ? 'Auto' : 'Manual'}
            </span>
          </button>
        ))}
      </div>

      {/* Search mode */}
      {mode === 'search' && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <MapPin
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search your building, street or area"
              aria-label="Search for your delivery location"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'location-pin-error' : undefined}
              onKeyDown={handleSearchKeyDown}
              onBlur={handleSearchBlur}
              autoComplete="off"
              className={cn(
                'h-12 w-full rounded-[var(--radius-input)] border bg-surface pl-9 pr-4 text-sm text-text-primary transition-colors placeholder:text-text-secondary focus:outline-none focus:ring-2',
                error
                  ? 'border-error focus:border-error focus:ring-error/20'
                  : 'border-gray-300 focus:border-primary focus:ring-primary/20',
              )}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={triggerSearchFromInput}
            disabled={isLookingUp}
            className="shrink-0"
          >
            {isLookingUp ? 'Searching...' : 'Search'}
          </Button>
        </div>
      )}

      {/* Auto-detect mode */}
      {mode === 'auto' && (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm text-text-secondary">
            We'll use your device's GPS to pin your location and fill in the address fields.
            You can edit any field after detection.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              didAutoLocateRef.current = false
              handleUseMyLocation()
            }}
            disabled={isLocating || isLookingUp}
          >
            <Crosshair className="h-4 w-4" aria-hidden="true" />
            {isLocating
              ? 'Detecting location…'
              : isLookingUp
                ? 'Finding address…'
                : latitude !== null
                  ? 'Re-detect my location'
                  : 'Detect my location'}
          </Button>
          {latitude !== null && longitude !== null && !isLocating && !isLookingUp && (
            <p className="text-xs text-green-700">
              Location detected — edit the fields below if needed.
            </p>
          )}
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm text-text-secondary">
            Fill in your address details manually in the fields below.
          </p>
        </div>
      )}

      {/* Error message */}
      {loadError ? (
        <p className="text-sm text-error" role="alert">
          {loadError}
        </p>
      ) : null}

      {/* Map — shown for search and auto modes */}
      {mode !== 'manual' && (
        <>
          <div
            ref={mapContainerRef}
            className={cn(
              'h-56 w-full overflow-hidden rounded-[var(--radius-card)] border bg-background',
              error ? 'border-error' : 'border-gray-200',
            )}
            role="application"
            aria-label="Delivery location map"
            aria-invalid={Boolean(error)}
          />
          {error ? (
            <p id="location-pin-error" className="text-xs text-error" role="alert">
              {error}
            </p>
          ) : (
            <p className="text-xs text-text-secondary">
              {isLookingUp
                ? 'Looking up the address for this pin…'
                : latitude !== null && longitude !== null
                  ? 'Address fields below update from this pin. Edit house number or landmark if needed.'
                  : mode === 'search'
                    ? required
                      ? 'Pick a suggestion, press Enter, or tap the map to drop a pin.'
                      : 'Search above or tap the map to drop a pin. This sets your delivery charge.'
                    : 'Tap "Detect my location" above, or tap the map to place a pin manually.'}
            </p>
          )}
        </>
      )}
    </div>
  )
}
