import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DELIVERY_SETTINGS,
  describeServiceArea,
  isPincodeServiceable,
  parsePincodeList,
  serviceAreaNotice,
} from './deliverySettingsService'

describe('parsePincodeList', () => {
  it('accepts comma, space, and newline separated pincodes', () => {
    const result = parsePincodeList('560034, 560095\n411001 560034')

    expect(result.pincodes).toEqual(['411001', '560034', '560095'])
    expect(result.invalid).toEqual([])
  })

  it('reports entries that are not six digits', () => {
    const result = parsePincodeList('560034, 56003, bangalore')

    expect(result.pincodes).toEqual(['560034'])
    expect(result.invalid).toEqual(['56003', 'bangalore'])
  })

  it('returns nothing for an empty string', () => {
    expect(parsePincodeList('   ')).toEqual({ pincodes: [], invalid: [] })
  })
})

describe('isPincodeServiceable', () => {
  it('accepts every pincode when no service area is configured', () => {
    expect(isPincodeServiceable('999999', DEFAULT_DELIVERY_SETTINGS)).toBe(true)
  })

  it('treats a configured list as an allowlist', () => {
    const settings = {
      ...DEFAULT_DELIVERY_SETTINGS,
      service_pincodes: ['560034', '411001'],
    }

    expect(isPincodeServiceable('560034', settings)).toBe(true)
    expect(isPincodeServiceable('560001', settings)).toBe(false)
  })

  it('ignores surrounding whitespace on the address pincode', () => {
    const settings = {
      ...DEFAULT_DELIVERY_SETTINGS,
      service_pincodes: ['411001'],
    }

    expect(isPincodeServiceable(' 411001 ', settings)).toBe(true)
  })
})

describe('describeServiceArea', () => {
  it('says the area is unrestricted when no rule is set', () => {
    expect(describeServiceArea(DEFAULT_DELIVERY_SETTINGS)).toBe(
      'You currently accept orders to every address.',
    )
  })

  it('combines the distance and pincode rules', () => {
    const settings = {
      ...DEFAULT_DELIVERY_SETTINGS,
      max_distance_km: 6,
      service_pincodes: ['560034', '560095'],
    }

    expect(describeServiceArea(settings, 'Jubilee Hills')).toBe(
      'You deliver within 6 km of Jubilee Hills and to 2 pincodes.',
    )
  })
})

describe('serviceAreaNotice', () => {
  it('shows nothing when every address is accepted', () => {
    expect(serviceAreaNotice(DEFAULT_DELIVERY_SETTINGS)).toBeNull()
  })

  it('prefers the wording the restaurant wrote', () => {
    const settings = {
      ...DEFAULT_DELIVERY_SETTINGS,
      max_distance_km: 6,
      service_area_note: 'We deliver across Jubilee Hills and Madhapur.',
    }

    expect(serviceAreaNotice(settings, 'Jubilee Hills')).toBe(
      'We deliver across Jubilee Hills and Madhapur.',
    )
  })

  it('falls back to the configured rules', () => {
    const settings = { ...DEFAULT_DELIVERY_SETTINGS, max_distance_km: 6 }

    expect(serviceAreaNotice(settings, 'Jubilee Hills')).toBe(
      'We deliver within 6 km of Jubilee Hills.',
    )
  })
})
