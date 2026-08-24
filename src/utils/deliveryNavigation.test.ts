import { describe, expect, it } from 'vitest'
import { googleMapsNavigationUrl } from '@/utils/deliveryNavigation'

describe('googleMapsNavigationUrl', () => {
  it('prefers coordinates over address', () => {
    const url = googleMapsNavigationUrl({
      lat: 18.5679,
      lng: 73.9143,
      address: 'Viman Nagar, Pune',
    })
    expect(url).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=18.5679%2C73.9143&travelmode=driving',
    )
  })

  it('falls back to the written address', () => {
    const url = googleMapsNavigationUrl({
      lat: null,
      lng: null,
      address: '1, Gulmohar, Pune 411014',
    })
    expect(url).toContain('destination=1%2C%20Gulmohar%2C%20Pune%20411014')
    expect(url).toContain('travelmode=driving')
  })

  it('returns null when there is nowhere to navigate', () => {
    expect(googleMapsNavigationUrl({})).toBeNull()
    expect(googleMapsNavigationUrl({ address: '   ' })).toBeNull()
  })
})
