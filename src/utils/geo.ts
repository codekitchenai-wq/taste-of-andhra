const EARTH_RADIUS_KM = 6_371
const EARTH_RADIUS_M = EARTH_RADIUS_KM * 1_000

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radius: number,
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2

  return 2 * radius * Math.asin(Math.sqrt(a))
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return haversine(lat1, lng1, lat2, lng2, EARTH_RADIUS_KM)
}

export function distanceInMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return haversine(lat1, lng1, lat2, lng2, EARTH_RADIUS_M)
}
