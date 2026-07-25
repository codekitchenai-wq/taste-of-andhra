export type DeliveryProvider = 'own' | 'pidge'

export interface DeliverySettings {
  id: string
  branch_id: string | null
  provider: DeliveryProvider
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
  updated_at: string
}

export interface DeliverySettingsInput {
  provider: DeliveryProvider
  isEnabled: boolean
  servicePincodes: string[]
  maxDistanceKm: number | null
  requireLocationPin: boolean
  serviceAreaNote: string | null
  markupFlat: number
  markupPercent: number
  fallbackCharge: number
  freeDeliveryThreshold: number | null
}

/** Outcome of the check_delivery_service_area database function. */
export interface ServiceAreaCheck {
  isServiceable: boolean
  reason: string | null
  distanceKm: number | null
  maxDistanceKm: number | null
}
