import { useCallback, useEffect, useRef, useState } from 'react'
import * as deliveryService from '@/services/deliveryService'

// Writing every GPS fix would hammer the database, so a fix is only persisted
// when the partner has moved far enough or enough time has passed.
const MIN_WRITE_INTERVAL_MS = 10_000
const MIN_WRITE_DISTANCE_M = 25

export type LocationSharingStatus =
  | 'idle'
  | 'sharing'
  | 'denied'
  | 'unsupported'
  | 'error'

export interface UseLiveLocationSharingResult {
  status: LocationSharingStatus
  isSharing: boolean
  isScreenAwake: boolean
  lastSentAt: Date | null
  error: string | null
  start: () => void
  stop: () => void
  toggle: () => void
}

function distanceInMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earthRadius = 6_371_000
  const toRadians = (value: number) => (value * Math.PI) / 180
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2

  return 2 * earthRadius * Math.asin(Math.sqrt(a))
}

interface UseLiveLocationSharingOptions {
  deliveryId: string | undefined
  /** Auto-start sharing when the delivery is active and permission allows it. */
  autoStart?: boolean
}

export function useLiveLocationSharing({
  deliveryId,
  autoStart = false,
}: UseLiveLocationSharingOptions): UseLiveLocationSharingResult {
  const [status, setStatus] = useState<LocationSharingStatus>('idle')
  const [isScreenAwake, setIsScreenAwake] = useState(false)
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const lastSentRef = useRef<{ lat: number; lng: number; at: number } | null>(
    null,
  )
  const deliveryIdRef = useRef(deliveryId)
  deliveryIdRef.current = deliveryId

  const releaseWakeLock = useCallback(() => {
    const sentinel = wakeLockRef.current
    wakeLockRef.current = null
    setIsScreenAwake(false)
    if (sentinel) {
      void sentinel.release().catch(() => undefined)
    }
  }, [])

  // A locked screen suspends geolocation on mobile, so hold a screen wake lock
  // for as long as the partner is on an active delivery.
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') {
      return
    }

    if (wakeLockRef.current) return

    try {
      const sentinel = await navigator.wakeLock.request('screen')
      wakeLockRef.current = sentinel
      setIsScreenAwake(true)
      sentinel.addEventListener('release', () => {
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null
          setIsScreenAwake(false)
        }
      })
    } catch {
      // Wake lock is best effort; sharing still works while the screen is on.
      setIsScreenAwake(false)
    }
  }, [])

  const publishPosition = useCallback((position: GeolocationPosition) => {
    const id = deliveryIdRef.current
    if (!id) return

    const { latitude, longitude } = position.coords
    const previous = lastSentRef.current
    const now = Date.now()

    if (previous) {
      const movedFarEnough =
        distanceInMeters(previous.lat, previous.lng, latitude, longitude) >=
        MIN_WRITE_DISTANCE_M
      const waitedLongEnough = now - previous.at >= MIN_WRITE_INTERVAL_MS

      if (!movedFarEnough && !waitedLongEnough) return
    }

    lastSentRef.current = { lat: latitude, lng: longitude, at: now }

    void deliveryService
      .updateDeliveryLocation(id, latitude, longitude)
      .then((result) => {
        if (result.success) {
          setLastSentAt(new Date())
          setError(null)
        } else {
          setError(result.message)
        }
      })
  }, [])

  const stop = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    lastSentRef.current = null
    releaseWakeLock()
    setStatus((previous) => (previous === 'sharing' ? 'idle' : previous))
  }, [releaseWakeLock])

  const start = useCallback(() => {
    if (!deliveryIdRef.current) return
    if (watchIdRef.current != null) return

    if (!('geolocation' in navigator)) {
      setStatus('unsupported')
      setError('This device does not support location sharing.')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      publishPosition,
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setStatus('denied')
          setError(
            'Location permission is blocked. Enable it in your browser settings to share your position.',
          )
          stop()
          return
        }

        if (geoError.code === geoError.TIMEOUT) {
          setStatus('error')
          setError(
            'Could not get a GPS fix in time. Move outdoors or check that location services are on, then try again.',
          )
          return
        }

        setStatus('error')
        setError(geoError.message || 'Unable to read your location.')
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 },
    )

    setStatus('sharing')
    setError(null)
    void requestWakeLock()
  }, [publishPosition, requestWakeLock, stop])

  const toggle = useCallback(() => {
    if (watchIdRef.current != null) {
      stop()
    } else {
      start()
    }
  }, [start, stop])

  useEffect(() => {
    if (!autoStart || !deliveryId) return

    let cancelled = false

    const startUnlessBlocked = async () => {
      // Skip the auto-start when permission was previously denied, otherwise
      // the partner sees an error banner they cannot act on from this page.
      if (navigator.permissions?.query) {
        try {
          const permission = await navigator.permissions.query({
            name: 'geolocation',
          })
          if (permission.state === 'denied') {
            if (!cancelled) {
              setStatus('denied')
              setError(
                'Location permission is blocked. Enable it in your browser settings to share your position.',
              )
            }
            return
          }
        } catch {
          // Permissions API is unavailable; fall through and let the
          // geolocation prompt decide.
        }
      }

      if (!cancelled) start()
    }

    void startUnlessBlocked()

    return () => {
      cancelled = true
    }
  }, [autoStart, deliveryId, start])

  // Browsers drop the wake lock whenever the tab is backgrounded, and the
  // position goes stale while hidden, so both are refreshed on return.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (watchIdRef.current == null) return

      void requestWakeLock()
      navigator.geolocation.getCurrentPosition(publishPosition, () => undefined, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20_000,
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [publishPosition, requestWakeLock])

  useEffect(() => stop, [stop])

  return {
    status,
    isSharing: status === 'sharing',
    isScreenAwake,
    lastSentAt,
    error,
    start,
    stop,
    toggle,
  }
}
