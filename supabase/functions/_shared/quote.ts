export interface DeliverySettingsRow {
  provider: string
  is_enabled: boolean
  service_pincodes: string[]
  max_distance_km: number | null
  require_location_pin: boolean
  service_area_note: string | null
  markup_flat: number
  markup_percent: number
  fallback_charge: number
  per_km_charge: number
  free_delivery_threshold: number | null
  quote_ttl_seconds: number
}

export const DEFAULT_SETTINGS: DeliverySettingsRow = {
  provider: 'own',
  is_enabled: false,
  service_pincodes: [],
  max_distance_km: null,
  require_location_pin: false,
  service_area_note: null,
  markup_flat: 0,
  markup_percent: 0,
  fallback_charge: 49,
  per_km_charge: 0,
  free_delivery_threshold: 399,
  quote_ttl_seconds: 900,
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Own-fleet rate card: base + optional ₹/km from haversine distance.
 * When distance is unknown or per_km_charge is 0, only the base applies.
 */
export function calculateRateCardAmount(
  settings: Pick<
    DeliverySettingsRow,
    'fallback_charge' | 'per_km_charge' | 'free_delivery_threshold'
  >,
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

  return roundCurrency(base + Math.max(0, distanceKm) * perKm)
}

export function applyMarkup(
  providerAmount: number,
  settings: DeliverySettingsRow,
): number {
  const withPercent = providerAmount * (1 + settings.markup_percent / 100)
  return roundCurrency(withPercent + settings.markup_flat)
}
