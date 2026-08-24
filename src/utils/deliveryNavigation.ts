/** Google Maps turn-by-turn URL for a drop-off pin or address. */

export function googleMapsNavigationUrl(input: {
  lat?: number | null
  lng?: number | null
  address?: string | null
}): string | null {
  const lat = input.lat
  const lng = input.lng
  if (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    typeof lng === 'number' &&
    Number.isFinite(lng)
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat}%2C${lng}&travelmode=driving`
  }

  const address = input.address?.trim()
  if (!address) return null

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    address,
  )}&travelmode=driving`
}
