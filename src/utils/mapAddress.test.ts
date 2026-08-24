import { describe, expect, it } from 'vitest'
import {
  addressTypeKind,
  formatAddressLabel,
  hasLocationPin,
} from './mapAddress'
import type { Address } from '@/types/Address'

function address(
  overrides: Partial<Pick<Address, 'latitude' | 'longitude'>> = {},
): Pick<Address, 'latitude' | 'longitude'> {
  return { latitude: 17.385, longitude: 78.4867, ...overrides }
}

describe('hasLocationPin', () => {
  it('is true when both coordinates are finite numbers', () => {
    expect(hasLocationPin(address())).toBe(true)
  })

  it('is false when either coordinate is missing', () => {
    expect(hasLocationPin(address({ latitude: null }))).toBe(false)
    expect(hasLocationPin(address({ longitude: null }))).toBe(false)
    expect(hasLocationPin(address({ latitude: null, longitude: null }))).toBe(
      false,
    )
  })

  it('is false for null or undefined addresses', () => {
    expect(hasLocationPin(null)).toBe(false)
    expect(hasLocationPin(undefined)).toBe(false)
  })

  it('is false for non-finite coordinates', () => {
    expect(hasLocationPin(address({ latitude: Number.NaN }))).toBe(false)
    expect(hasLocationPin(address({ longitude: Number.POSITIVE_INFINITY }))).toBe(
      false,
    )
  })
})

describe('formatAddressLabel', () => {
  it('names preset types Home and Work', () => {
    expect(formatAddressLabel('home')).toBe('Home')
    expect(formatAddressLabel('work')).toBe('Work')
  })

  it('keeps a custom place name', () => {
    expect(formatAddressLabel("Mom's house")).toBe("Mom's house")
    expect(formatAddressLabel('Office 2')).toBe('Office 2')
  })

  it('falls back to Other', () => {
    expect(formatAddressLabel('other')).toBe('Other')
    expect(formatAddressLabel('')).toBe('Other')
  })
})

describe('addressTypeKind', () => {
  it('treats custom names as other', () => {
    expect(addressTypeKind('home')).toBe('home')
    expect(addressTypeKind('work')).toBe('work')
    expect(addressTypeKind("Mom's house")).toBe('other')
  })
})
