import { describe, expect, it } from 'vitest'
import { calculateRateCardAmount } from './deliveryRateCard'

const settings = {
  fallback_charge: 49,
  per_km_charge: 0,
  free_delivery_threshold: 399,
}

describe('calculateRateCardAmount', () => {
  it('returns free delivery above the threshold', () => {
    expect(calculateRateCardAmount(settings, 399, 4)).toBe(0)
    expect(calculateRateCardAmount(settings, 500, null)).toBe(0)
  })

  it('uses the flat base charge when per-km is zero', () => {
    expect(calculateRateCardAmount(settings, 100, 8.5)).toBe(49)
  })

  it('uses only the base charge when distance is unknown', () => {
    expect(
      calculateRateCardAmount(
        { ...settings, per_km_charge: 10 },
        100,
        null,
      ),
    ).toBe(49)
  })

  it('adds base plus distance times per-km', () => {
    expect(
      calculateRateCardAmount(
        { ...settings, per_km_charge: 10 },
        100,
        3.5,
      ),
    ).toBe(84)
  })

  it('rounds to two decimal places', () => {
    expect(
      calculateRateCardAmount(
        { fallback_charge: 30, per_km_charge: 7.5, free_delivery_threshold: null },
        100,
        2.33,
      ),
    ).toBe(47.48)
  })
})
