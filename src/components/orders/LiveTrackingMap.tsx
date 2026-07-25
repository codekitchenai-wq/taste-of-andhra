import { useEffect, useState } from 'react'
import type { Delivery } from '@/types/Delivery'
import * as deliveryService from '@/services/deliveryService'

interface LiveMapProps {
  orderId: string
  dropoffLat?: number | null
  dropoffLng?: number | null
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
  const marker = markerLat != null && markerLng != null
    ? `&marker=${markerLat}%2C${markerLng}`
    : ''
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik${marker}&marker=${lat}%2C${lng}`
}

export function LiveTrackingMap({
  orderId,
  dropoffLat,
  dropoffLng,
  className,
}: LiveMapProps) {
  const [delivery, setDelivery] = useState<Delivery | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const result = await deliveryService.getDeliveryByOrderId(orderId)
      if (!cancelled && result.success) {
        setDelivery(result.data)
      }
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

  if (
    !delivery ||
    delivery.current_lat == null ||
    delivery.current_lng == null
  ) {
    return (
      <div
        className={
          className ??
          'flex h-56 items-center justify-center rounded-[var(--radius-card)] bg-background text-sm text-text-secondary'
        }
      >
        Live location will appear when the delivery partner starts sharing GPS.
      </div>
    )
  }

  const mapUrl = buildOsmEmbedUrl(
    delivery.current_lat,
    delivery.current_lng,
    dropoffLat,
    dropoffLng,
  )

  const updatedLabel = delivery.location_updated_at
    ? new Date(delivery.location_updated_at).toLocaleTimeString()
    : null

  return (
    <div className={className}>
      <iframe
        title="Live delivery map"
        src={mapUrl}
        className="h-56 w-full rounded-[var(--radius-card)] border-0"
        loading="lazy"
      />
      <p className="mt-2 text-xs text-text-secondary">
        Partner location
        {updatedLabel ? ` · updated ${updatedLabel}` : ''}
        {delivery.delivery_partner
          ? ` · ${delivery.delivery_partner}`
          : ''}
      </p>
    </div>
  )
}
