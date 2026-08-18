import { describe, expect, it } from 'vitest'
import {
  distanceToRestaurantKm,
  isWithinNearbyDelivery,
  NEARBY_DELIVERY_MAX_KM,
  restaurantLocationFromBranch,
} from './nearbyAddress'
import type { Branch } from '@/types/Branch'

const restaurant = {
  name: 'Taste of Andhra',
  latitude: 18.5679,
  longitude: 73.9143,
}

function branch(
  overrides: Partial<Pick<Branch, 'name' | 'latitude' | 'longitude'>> = {},
): Pick<Branch, 'name' | 'latitude' | 'longitude'> {
  return {
    name: 'Viman Nagar',
    latitude: 18.5679,
    longitude: 73.9143,
    ...overrides,
  }
}

describe('restaurantLocationFromBranch', () => {
  it('returns coordinates when the branch pin is set', () => {
    expect(restaurantLocationFromBranch(branch())).toEqual({
      name: 'Viman Nagar',
      latitude: 18.5679,
      longitude: 73.9143,
    })
  })

  it('returns null when the branch has no pin', () => {
    expect(
      restaurantLocationFromBranch(branch({ latitude: null, longitude: null })),
    ).toBeNull()
    expect(restaurantLocationFromBranch(null)).toBeNull()
  })
})

describe('isWithinNearbyDelivery', () => {
  it('accepts a location inside 20 km of the restaurant', () => {
    const nearbyKm = distanceToRestaurantKm(18.52, 73.85, restaurant)
    expect(nearbyKm).toBeLessThan(NEARBY_DELIVERY_MAX_KM)
    expect(isWithinNearbyDelivery(nearbyKm)).toBe(true)
  })

  it('rejects a location farther than 20 km', () => {
    const farKm = distanceToRestaurantKm(19.08, 74.74, restaurant)
    expect(farKm).toBeGreaterThan(NEARBY_DELIVERY_MAX_KM)
    expect(isWithinNearbyDelivery(farKm)).toBe(false)
  })
})
