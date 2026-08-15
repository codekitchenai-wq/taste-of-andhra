import { describe, expect, it } from 'vitest'
import {
  parsePlaceComponents,
  pickBestGeocodeResult,
  mergeResolvedPlaces,
} from './googleMaps'

function component(
  types: string[],
  longName: string,
): google.maps.GeocoderAddressComponent {
  return {
    long_name: longName,
    short_name: longName,
    types,
  }
}

describe('parsePlaceComponents', () => {
  it('fills street, area, city, state and pincode from Google components', () => {
    const parsed = parsePlaceComponents(
      [
        component(['premise'], 'Harsha Pride'),
        component(['street_number'], '12'),
        component(['route'], '29th C Cross Rd'),
        component(['sublocality_level_1', 'sublocality'], 'Kaggadasapura'),
        component(['locality'], 'Bengaluru'),
        component(['administrative_area_level_1'], 'Karnataka'),
        component(['postal_code'], '560093'),
      ],
      'Harsha Pride, 12 29th C Cross Rd, Kaggadasapura, Bengaluru, Karnataka 560093',
    )

    expect(parsed.addressLine1).toBe('Harsha Pride 12 29th C Cross Rd')
    expect(parsed.addressLine2).toBe('Kaggadasapura')
    expect(parsed.landmark).toBe('Kaggadasapura')
    expect(parsed.city).toBe('Bengaluru')
    expect(parsed.state).toBe('Karnataka')
    expect(parsed.pincode).toBe('560093')
  })

  it('falls back to the formatted address when street parts are missing', () => {
    const parsed = parsePlaceComponents(
      [component(['locality'], 'Hyderabad')],
      'Some Building, Hyderabad, Telangana 500081',
    )

    expect(parsed.addressLine1).toBe('Some Building')
    expect(parsed.city).toBe('Hyderabad')
  })
})

describe('pickBestGeocodeResult', () => {
  it('prefers a street result that includes a pincode', () => {
    const best = pickBestGeocodeResult([
      { types: ['plus_code'], address_components: [] },
      {
        types: ['street_address'],
        address_components: [{ types: ['postal_code'] }],
      },
    ])

    expect(best?.types).toEqual(['street_address'])
  })
})

describe('mergeResolvedPlaces', () => {
  it('fills gaps from the fallback place', () => {
    const merged = mergeResolvedPlaces(
      {
        latitude: 12.97,
        longitude: 77.59,
        addressLine1: 'Harsha Pride',
        addressLine2: '',
        landmark: '',
        city: '',
        state: '',
        pincode: '',
        formattedAddress: 'Harsha Pride',
      },
      {
        latitude: 12.97,
        longitude: 77.59,
        addressLine1: '29th C Cross Rd',
        addressLine2: 'Kaggadasapura',
        landmark: 'Kaggadasapura',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560093',
        formattedAddress: '29th C Cross Rd, Bengaluru',
      },
    )

    expect(merged.addressLine1).toBe('Harsha Pride')
    expect(merged.city).toBe('Bengaluru')
    expect(merged.pincode).toBe('560093')
  })
})
