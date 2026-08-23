import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'

/**
 * Informational copy when a Chopsticks Onam address is outside the usual
 * delivery radius. FYI only — must not block save or checkout.
 */
export function onamDeliveryOutOfRangeMessage(opts?: {
  distanceKm?: number | null
  maxKm?: number | null
}): string {
  const maxKm = opts?.maxKm ?? ONAM_SADHYA.deliveryRadiusKm
  const area = ONAM_SADHYA.deliveryAreaName
  const distanceKm = opts?.distanceKm

  if (distanceKm != null && Number.isFinite(distanceKm)) {
    return `For reference: this address is about ${distanceKm.toFixed(1)} km from our kitchen in ${area}. We usually deliver within ${maxKm} km of ${area} — our team will confirm delivery for you.`
  }

  return `For reference: we usually deliver within ${maxKm} km of our kitchen in ${area}. Our team will confirm delivery for addresses farther away.`
}
