import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AdminOrder } from '@/services/orderService'

const MUTE_STORAGE_KEY = 'toa-kitchen-alerts-muted'
const SOUND_INTERVAL_MS = 1_400

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function playBeep(audioContext: AudioContext) {
  const now = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = 'square'
  oscillator.frequency.setValueAtTime(880, now)
  oscillator.frequency.setValueAtTime(660, now + 0.12)
  oscillator.frequency.setValueAtTime(880, now + 0.24)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.4)
}

export interface UseNewOrderAlertsResult {
  alertingOrders: AdminOrder[]
  isMuted: boolean
  toggleMute: () => void
  dismissAlert: (orderId: string) => void
  clearAlerts: () => void
}

export function useNewOrderAlerts(
  orders: AdminOrder[],
  isReady = true,
): UseNewOrderAlertsResult {
  const [isMuted, setIsMuted] = useState(readMuted)
  const [alertingIds, setAlertingIds] = useState<string[]>([])
  const knownPendingIdsRef = useRef<Set<string> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const soundIntervalRef = useRef<number | null>(null)
  const permissionRequestedRef = useRef(false)

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.order_status === 'pending'),
    [orders],
  )

  const pendingIdsKey = useMemo(
    () =>
      pendingOrders
        .map((order) => order.id)
        .sort()
        .join(','),
    [pendingOrders],
  )

  useEffect(() => {
    // Wait until the first orders fetch finishes so the initial pending queue
    // is treated as known — not as a burst of brand-new alerts.
    if (!isReady) return

    const pendingIds = new Set(
      pendingIdsKey ? pendingIdsKey.split(',') : [],
    )

    if (knownPendingIdsRef.current === null) {
      knownPendingIdsRef.current = pendingIds
      return
    }

    const newlyPending: string[] = []
    for (const id of pendingIds) {
      if (!knownPendingIdsRef.current.has(id)) {
        newlyPending.push(id)
      }
    }

    // Remove alerts for orders that left pending
    setAlertingIds((prev) => prev.filter((id) => pendingIds.has(id)))

    knownPendingIdsRef.current = pendingIds

    if (newlyPending.length === 0) return

    setAlertingIds((prev) => {
      const next = new Set(prev)
      for (const id of newlyPending) next.add(id)
      return [...next]
    })

    if (
      !permissionRequestedRef.current &&
      typeof Notification !== 'undefined'
    ) {
      permissionRequestedRef.current = true
      if (Notification.permission === 'default') {
        void Notification.requestPermission()
      }
    }

    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      for (const id of newlyPending) {
        const order = pendingOrders.find((item) => item.id === id)
        if (!order) continue
        try {
          new Notification('New order received', {
            body: `${order.order_number} · ₹${Math.round(order.total)}`,
            tag: `order-${order.id}`,
            requireInteraction: true,
          })
        } catch {
          // Ignore notification failures (e.g. insecure context)
        }
      }
    }
  }, [isReady, pendingIdsKey, pendingOrders])

  const stopSound = useCallback(() => {
    if (soundIntervalRef.current != null) {
      window.clearInterval(soundIntervalRef.current)
      soundIntervalRef.current = null
    }
  }, [])

  const startSound = useCallback(() => {
    stopSound()

    const ensureContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      return audioContextRef.current
    }

    const tick = () => {
      try {
        const ctx = ensureContext()
        if (ctx.state === 'suspended') {
          void ctx.resume()
        }
        playBeep(ctx)
      } catch {
        // Audio may be blocked until user gesture
      }
    }

    tick()
    soundIntervalRef.current = window.setInterval(tick, SOUND_INTERVAL_MS)
  }, [stopSound])

  useEffect(() => {
    if (alertingIds.length > 0 && !isMuted) {
      startSound()
    } else {
      stopSound()
    }

    return stopSound
  }, [alertingIds, isMuted, startSound, stopSound])

  useEffect(() => {
    return () => {
      stopSound()
      void audioContextRef.current?.close()
    }
  }, [stopSound])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const dismissAlert = useCallback((orderId: string) => {
    setAlertingIds((prev) => prev.filter((id) => id !== orderId))
  }, [])

  const clearAlerts = useCallback(() => {
    setAlertingIds([])
  }, [])

  const alertingOrders = pendingOrders.filter((order) =>
    alertingIds.includes(order.id),
  )

  return {
    alertingOrders,
    isMuted,
    toggleMute,
    dismissAlert,
    clearAlerts,
  }
}
