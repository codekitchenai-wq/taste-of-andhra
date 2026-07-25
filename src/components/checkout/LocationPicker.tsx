import { useCallback, useEffect, useRef, useState } from 'react'
import { Crosshair, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  isGoogleMapsConfigured,
  loadGoogleMaps,
  parsePlaceComponents,
  reverseGeocode,
  type ResolvedPlace,
} from '@/utils/googleMaps'

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  onChange: (place: ResolvedPlace) => void
}

// Centred on India so the first view is useful before a pin is dropped.
const FALLBACK_CENTER = { lat: 20.5937, lng: 78.9629 }
const FALLBACK_ZOOM = 5
const PINNED_ZOOM = 17

export function LocationPicker({
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const mapsRef = useRef<typeof google.maps | null>(null)

  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  // Held in refs so the map's listeners, registered once, never read stale
  // props. Re-creating the map on every render would drop the user's pin.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const initialPositionRef = useRef({ latitude, longitude })

  const commitPosition = useCallback(
    async (lat: number, lng: number, known?: ResolvedPlace) => {
      const maps = mapsRef.current
      if (!maps) return

      markerRef.current?.setPosition({ lat, lng })
      mapRef.current?.panTo({ lat, lng })

      if (known) {
        onChangeRef.current(known)
        return
      }

      const resolved = await reverseGeocode(maps, lat, lng)

      onChangeRef.current(
        resolved ?? {
          latitude: lat,
          longitude: lng,
          addressLine1: '',
          city: '',
          state: '',
          pincode: '',
          formattedAddress: '',
        },
      )
    },
    [],
  )

  useEffect(() => {
    if (!isGoogleMapsConfigured) return

    let cancelled = false

    void loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapContainerRef.current) return

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

        const marker = new maps.Marker({
          map,
          position: center,
          draggable: true,
          visible: hasPin,
        })

        mapRef.current = map
        markerRef.current = marker

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
          const autocomplete = new maps.places.Autocomplete(
            searchInputRef.current,
            {
              componentRestrictions: { country: 'in' },
              fields: ['address_components', 'geometry', 'formatted_address'],
            },
          )

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace()
            const location = place.geometry?.location

            if (!location) return

            marker.setVisible(true)
            map.setZoom(PINNED_ZOOM)

            void commitPosition(location.lat(), location.lng(), {
              latitude: location.lat(),
              longitude: location.lng(),
              ...parsePlaceComponents(
                place.address_components ?? [],
                place.formatted_address ?? '',
              ),
            })
          })
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
    }
  }, [commitPosition])

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

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false)
        markerRef.current?.setVisible(true)
        mapRef.current?.setZoom(PINNED_ZOOM)
        void commitPosition(
          position.coords.latitude,
          position.coords.longitude,
        )
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  if (!isGoogleMapsConfigured) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-gray-300 bg-background p-4 text-sm text-text-secondary">
        Map location is unavailable because{' '}
        <code className="rounded bg-surface px-1">
          VITE_GOOGLE_MAPS_API_KEY
        </code>{' '}
        is not set. Your address will still be saved, but delivery pricing may
        be less accurate.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search your building, street or area"
            aria-label="Search for your delivery location"
            className="h-12 w-full rounded-[var(--radius-input)] border border-gray-300 bg-surface pl-9 pr-4 text-sm text-text-primary transition-colors placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="shrink-0"
        >
          <Crosshair className="h-4 w-4" aria-hidden="true" />
          {isLocating ? 'Locating...' : 'Use my location'}
        </Button>
      </div>

      {loadError ? (
        <p className="text-sm text-error" role="alert">
          {loadError}
        </p>
      ) : (
        <>
          <div
            ref={mapContainerRef}
            className="h-56 w-full overflow-hidden rounded-[var(--radius-card)] border border-gray-200 bg-background"
            role="application"
            aria-label="Delivery location map"
          />
          <p className="text-xs text-text-secondary">
            {latitude !== null && longitude !== null
              ? 'Drag the pin to your exact gate or door so the rider finds you.'
              : 'Search above or tap the map to drop a pin. This sets your delivery charge.'}
          </p>
        </>
      )}
    </div>
  )
}
