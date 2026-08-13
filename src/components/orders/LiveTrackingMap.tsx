import { useEffect, useState } from 'react'
import { Clock, MapPin } from 'lucide-react'
import type { Delivery } from '@/types/Delivery'
import type { OrderStatus } from '@/types/enums'
import * as deliveryService from '@/services/deliveryService'
import { getPartnerEtaDisplay } from '@/utils/partnerEta'

interface LiveMapProps {
  orderId: string
  dropoffLat?: number | null
  dropoffLng?: number | null
  orderStatus?: OrderStatus | null
  className?: string
}

function buildOsmEmbedUrl(
  lat: number,
  lng: number,
  markerLat?: number | null,
  markerLng?: number | null,
): string {
  const delta = 0.012
  const left = Math.min(lng, markerLng ?? lng) - delta
  const right = Math.max(lng, markerLng ?? lng) + delta
  const bottom = Math.min(lat, markerLat ?? lat) - delta
  const top = Math.max(lat, markerLat ?? lat) + delta
  const marker =
    markerLat != null && markerLng != null
      ? `&marker=${markerLat}%2C${markerLng}`
      : ''
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik${marker}&marker=${lat}%2C${lng}`
}

export function LiveTrackingMap({
  orderId,
  dropoffLat,
  dropoffLng,
  orderStatus,
  className,
}: LiveMapProps) {
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const result = await deliveryService.getDeliveryByOrderId(orderId)
      if (cancelled) return
      if (result.success) {
        setDelivery(result.data)
      }
      setIsLoading(false)
    }

    void load()

    const unsubscribe = deliveryService.subscribeToDeliveryLocation(
      orderId,
      (updated) => setDelivery(updated),
    )

    const poll = window.setInterval(() => void load(), 15000)

    return () => {
      cancelled = true
      unsubscribe()
      window.clearInterval(poll)
    }
  }, [orderId])

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const status = orderStatus ?? delivery?.status ?? null
  const hasFix =
    delivery != null &&
    delivery.current_lat != null &&
    delivery.current_lng != null

  const eta = getPartnerEtaDisplay({
    partnerLat: delivery?.current_lat,
    partnerLng: delivery?.current_lng,
    dropoffLat,
    dropoffLng,
    locationUpdatedAt: delivery?.location_updated_at,
    orderStatus: status,
    nowMs,
  })

  const updatedLabel = delivery?.location_updated_at
    ? new Date(delivery.location_updated_at).toLocaleTimeString()
    : null

  if (isLoading) {
    return (
      <div
        className={
          className ??
          'rounded-[var(--radius-card)] bg-background p-4 text-sm text-text-secondary'
        }
      >
        Checking delivery assignment…
      </div>
    )
  }

  if (!delivery) {
    return (
      <div
        className={
          className ??
          'rounded-[var(--radius-card)] bg-background p-4 text-sm text-text-secondary'
        }
      >
        A delivery partner has not been assigned yet.
      </div>
    )
  }

  if (status !== 'out_for_delivery' && status !== 'delivered') {
    return (
      <div
        className={
          className ??
          'rounded-[var(--radius-card)] bg-background p-4 text-sm text-text-secondary'
        }
      >
        Assigned to {delivery.delivery_partner ?? 'your delivery partner'}.
        Live tracking and arrival time start when the order leaves the kitchen.
      </div>
    )
  }

  if (!hasFix) {
    return (
      <div
        className={
          className ??
          'flex h-56 items-center justify-center rounded-[var(--radius-card)] bg-background px-4 text-center text-sm text-text-secondary'
        }
      >
        Waiting for the delivery partner to share live location. Arrival time
        appears once GPS is on.
      </div>
    )
  }

  const mapUrl = buildOsmEmbedUrl(
    delivery.current_lat as number,
    delivery.current_lng as number,
    dropoffLat,
    dropoffLng,
  )

  return (
    <div className={className}>
      {eta.customerLabel && status === 'out_for_delivery' && (
        <p
          className={`mb-3 flex items-center gap-2 text-sm font-semibold ${
            eta.isStale ? 'text-error' : 'text-primary'
          }`}
        >
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          {eta.customerLabel}
        </p>
      )}
      <iframe
        title="Live delivery map"
        src={mapUrl}
        className="h-56 w-full rounded-[var(--radius-card)] border-0"
        loading="lazy"
      />
      <p className="mt-2 flex items-start gap-2 text-xs text-text-secondary">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Partner location
          {updatedLabel ? ` · updated ${updatedLabel}` : ''}
          {delivery.delivery_partner ? ` · ${delivery.delivery_partner}` : ''}
          {eta.shortLabel && status === 'out_for_delivery'
            ? ` · ${eta.shortLabel}`
            : ''}
        </span>
      </p>
    </div>
  )
}
