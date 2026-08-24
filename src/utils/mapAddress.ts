import type { Address } from '@/types/Address'

export function mapAddress(row: Record<string, unknown>): Address {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    organization_id: (row.organization_id as string) ?? '',
    address_type: row.address_type as string,
    full_name: row.full_name as string,
    phone: row.phone as string,
    address_line1: row.address_line1 as string,
    address_line2: (row.address_line2 as string | null) ?? null,
    landmark: (row.landmark as string | null) ?? null,
    city: row.city as string,
    state: row.state as string,
    pincode: row.pincode as string,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
    distance_km: row.distance_km != null ? Number(row.distance_km) : null,
    is_default: row.is_default as boolean,
    created_at: row.created_at as string,
  }
}

/** True when the customer dropped a usable map pin for distance and shipping. */
export function hasLocationPin(
  address: Pick<Address, 'latitude' | 'longitude'> | null | undefined,
): address is { latitude: number; longitude: number } {
  if (!address) return false

  return (
    address.latitude != null &&
    address.longitude != null &&
    Number.isFinite(address.latitude) &&
    Number.isFinite(address.longitude)
  )
}

export function formatAddressLine(address: Address): string {
  const parts = [
    address.address_line1,
    address.address_line2,
    address.landmark,
    `${address.city}, ${address.state} ${address.pincode}`,
  ].filter(Boolean)

  return parts.join(', ')
}

export type AddressTypeKind = 'home' | 'work' | 'other'

/** Maps a stored address_type to the Home / Work / Other picker. */
export function addressTypeKind(type: string | null | undefined): AddressTypeKind {
  const normalized = type?.trim().toLowerCase() ?? ''
  if (normalized === 'home') return 'home'
  if (normalized === 'work') return 'work'
  return 'other'
}

/** Customer-facing name for a saved place (Home, Work, or a custom label). */
export function formatAddressLabel(type: string | null | undefined): string {
  const kind = addressTypeKind(type)
  if (kind === 'home') return 'Home'
  if (kind === 'work') return 'Work'
  const trimmed = type?.trim() ?? ''
  if (!trimmed || trimmed.toLowerCase() === 'other') return 'Other'
  return trimmed
}
