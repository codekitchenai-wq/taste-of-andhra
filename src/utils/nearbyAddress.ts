import type { Branch } from '@/types/Branch'
import { haversineKm } from '@/utils/geo'

/** Nearby GPS option is only offered within this radius of the restaurant. */
export const NEARBY_DELIVERY_MAX_KM = 20

export interface RestaurantLocation {
  name: string
  latitude: number
  longitude: number
}

export function restaurantLocationFromBranch(
  branch: Pick<Branch, 'name' | 'latitude' | 'longitude'> | null | undefined,
): RestaurantLocation | null {
  if (!branch) return null
  if (
    branch.latitude == null ||
    branch.longitude == null ||
    !Number.isFinite(branch.latitude) ||
    !Number.isFinite(branch.longitude)
  ) {
    return null
  }

  return {
    name: branch.name,
    latitude: branch.latitude,
    longitude: branch.longitude,
  }
}

export function distanceToRestaurantKm(
  latitude: number,
  longitude: number,
  restaurant: RestaurantLocation,
): number {
  return haversineKm(
    restaurant.latitude,
    restaurant.longitude,
    latitude,
    longitude,
  )
}

export function isWithinNearbyDelivery(
  distanceKm: number,
  maxKm = NEARBY_DELIVERY_MAX_KM,
): boolean {
  return Number.isFinite(distanceKm) && distanceKm <= maxKm
}

export function readBrowserCoordinates(): Promise<{
  latitude: number
  longitude: number
}> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('This browser cannot share your location.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(
            new Error(
              'Location permission was blocked. Allow location, or enter your address.',
            ),
          )
          return
        }
        if (error.code === error.TIMEOUT) {
          reject(
            new Error(
              'Could not read your location in time. Enter your address instead.',
            ),
          )
          return
        }
        reject(
          new Error(
            'Could not read your location. Enter your address instead.',
          ),
        )
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  })
}
