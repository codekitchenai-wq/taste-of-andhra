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
  free_delivery_threshold: 399,
  quote_ttl_seconds: 900,
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

export function applyMarkup(
  providerAmount: number,
  settings: DeliverySettingsRow,
): number {
  const withPercent = providerAmount * (1 + settings.markup_percent / 100)
  return roundCurrency(withPercent + settings.markup_flat)
}
