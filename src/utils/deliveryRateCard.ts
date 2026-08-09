/**
 * Own-fleet delivery rate card: base + optional ₹/km from straight-line distance.
 * Kept free of framework imports so the Edge Function can mirror the same math.
 */

export interface RateCardSettings {
  fallback_charge: number
  per_km_charge: number
  free_delivery_threshold: number | null
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Prices an own-fleet delivery from restaurant settings and measured distance.
 * When distance is unknown (unpinned address/branch), only the base charge applies.
 */
export function calculateRateCardAmount(
  settings: RateCardSettings,
  subtotal: number,
  distanceKm: number | null,
): number {
  if (
    settings.free_delivery_threshold !== null &&
    subtotal >= settings.free_delivery_threshold
  ) {
    return 0
  }

  const base = Math.max(0, settings.fallback_charge)
  const perKm = Math.max(0, settings.per_km_charge)

  if (distanceKm === null || perKm === 0) {
    return roundCurrency(base)
  }

  const billedKm = Math.max(0, distanceKm)
  return roundCurrency(base + billedKm * perKm)
}
