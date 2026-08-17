import { describe, expect, it } from 'vitest'
import { isValidEmail, isValidPassword, isValidPhone } from './validation'

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('  user@example.com  ')).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('missing@domain')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('isValidPhone', () => {
  it('accepts a 10-digit Indian mobile', () => {
    expect(isValidPhone('9876543210')).toBe(true)
  })

  it('rejects non-Indian or non-10-digit values', () => {
    expect(isValidPhone('987654321')).toBe(false)
    expect(isValidPhone('98765432101')).toBe(false)
    expect(isValidPhone('98765 43210')).toBe(false)
    expect(isValidPhone('0123456789')).toBe(false)
  })
})

describe('isValidPassword', () => {
  it('requires at least 6 characters', () => {
    expect(isValidPassword('123456')).toBe(true)
    expect(isValidPassword('12345')).toBe(false)
  })
})
