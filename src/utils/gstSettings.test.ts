import { describe, expect, it } from 'vitest'
import { ORDER_TAX_RATE } from '@/constants/ORDER'
import {
  effectiveOrderTaxRate,
  isValidGstin,
  normalizeGstin,
  parseGstSettings,
} from './gstSettings'

describe('parseGstSettings', () => {
  it('defaults to GST off when unset', () => {
    expect(parseGstSettings(null)).toEqual({ enabled: false, gstin: '' })
    expect(parseGstSettings('')).toEqual({ enabled: false, gstin: '' })
  })

  it('parses JSON settings', () => {
    expect(
      parseGstSettings(
        JSON.stringify({ enabled: true, gstin: '29aabct1332l1zv' }),
      ),
    ).toEqual({ enabled: true, gstin: '29AABCT1332L1ZV' })
  })
})

describe('isValidGstin', () => {
  it('accepts a 15-character GSTIN', () => {
    expect(isValidGstin('29AABCT1332L1ZV')).toBe(true)
    expect(isValidGstin(' 29aabct1332l1zv ')).toBe(true)
  })

  it('rejects incomplete or empty values', () => {
    expect(isValidGstin('')).toBe(false)
    expect(isValidGstin('29AABCT1332')).toBe(false)
  })
})

describe('normalizeGstin', () => {
  it('uppercases and strips spaces', () => {
    expect(normalizeGstin(' 29aabct 1332l1zv ')).toBe('29AABCT1332L1ZV')
  })
})

describe('effectiveOrderTaxRate', () => {
  it('is 5% only when GST is enabled', () => {
    expect(effectiveOrderTaxRate(true)).toBe(ORDER_TAX_RATE)
    expect(effectiveOrderTaxRate(false)).toBe(0)
  })
})
