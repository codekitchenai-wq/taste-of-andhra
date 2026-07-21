import { describe, expect, it } from 'vitest'
import {
  formatIndianPhone,
  normalizeIndianPhone,
  toE164IndianPhone,
} from './phone'

describe('normalizeIndianPhone', () => {
  it('accepts a plain 10-digit number', () => {
    expect(normalizeIndianPhone('9876543210')).toBe('9876543210')
  })

  it('strips non-digit characters', () => {
    expect(normalizeIndianPhone('98765 43210')).toBe('9876543210')
    expect(normalizeIndianPhone('+91-98765-43210')).toBe('9876543210')
  })

  it('accepts numbers with 91 country prefix', () => {
    expect(normalizeIndianPhone('919876543210')).toBe('9876543210')
  })

  it('rejects invalid lengths', () => {
    expect(normalizeIndianPhone('987654321')).toBeNull()
    expect(normalizeIndianPhone('98765432101')).toBeNull()
    expect(normalizeIndianPhone('')).toBeNull()
  })
})

describe('toE164IndianPhone', () => {
  it('formats valid numbers as +91 E.164', () => {
    expect(toE164IndianPhone('9876543210')).toBe('+919876543210')
  })

  it('throws for invalid numbers', () => {
    expect(() => toE164IndianPhone('123')).toThrow('Invalid phone number')
  })
})

describe('formatIndianPhone', () => {
  it('formats as 5+5 digit groups', () => {
    expect(formatIndianPhone('9876543210')).toBe('98765 43210')
  })

  it('returns original string when invalid', () => {
    expect(formatIndianPhone('bad')).toBe('bad')
  })
})
