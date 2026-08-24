import { describe, expect, it } from 'vitest'
import {
  extractPincodeFromResults,
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

    expect(parsed.addressLine1).toBe('Harsha Pride, 12, 29th C Cross Rd')
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

  it('maps Indian locality components onto floor/area and landmark', () => {
    const parsed = parsePlaceComponents(
      [
        component(['route'], 'Baner Road'),
        component(['sublocality_level_2'], 'Balewadi'),
        component(['sublocality_level_1'], 'Baner'),
        component(['locality'], 'Pune'),
        component(['administrative_area_level_1'], 'Maharashtra'),
        component(['postal_code'], '411045'),
      ],
      'Baner Road, Balewadi, Baner, Pune, Maharashtra 411045',
    )

    expect(parsed.addressLine1).toBe('Baner Road')
    expect(parsed.addressLine2).toBe('Balewadi')
    expect(parsed.landmark).toBe('Balewadi')
    expect(parsed.city).toBe('Pune')
    expect(parsed.pincode).toBe('411045')
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

  it('keeps a street result even when the pincode is on another entry', () => {
    const best = pickBestGeocodeResult([
      { types: ['route'], address_components: [{ types: ['route'] }] },
      {
        types: ['postal_code'],
        address_components: [{ types: ['postal_code'], long_name: '411014' }],
      },
    ])

    expect(best?.types).toEqual(['route'])
  })
})

describe('extractPincodeFromResults', () => {
  it('reads the pincode from a later geocode result', () => {
    expect(
      extractPincodeFromResults([
        { address_components: [{ types: ['route'], long_name: 'Baner Road' }] },
        {
          address_components: [
            { types: ['postal_code'], long_name: '411014' },
          ],
        },
      ]),
    ).toBe('411014')
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
