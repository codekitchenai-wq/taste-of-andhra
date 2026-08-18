import { describe, expect, it } from 'vitest'
import { TASTE_OF_ANDHRA_ORG_ID } from '@/constants/ORGANIZATION'
import { razorpayKeyIdForTenant, envUpiFallback } from './tenantPayments'

describe('razorpayKeyIdForTenant', () => {
  it('uses the restaurant settings key and never inherits env for other tenants', () => {
    expect(
      razorpayKeyIdForTenant({
        settings: { razorpay_key_id: 'rzp_live_spice' },
        slug: 'chopsticksspicemalabar',
      }),
    ).toBe('rzp_live_spice')

    expect(
      razorpayKeyIdForTenant({
        settings: {},
        slug: 'chopsticksspicemalabar',
      }),
    ).toBeUndefined()
  })

  it('allows Taste of Andhra to fall back to the env key', () => {
    const envKey = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim()
    const result = razorpayKeyIdForTenant({
      settings: {},
      organizationId: TASTE_OF_ANDHRA_ORG_ID,
    })
    if (envKey && !envKey.includes('your_razorpay')) {
      expect(result).toBe(envKey)
    } else {
      expect(result).toBeUndefined()
    }
  })
})

describe('envUpiFallback', () => {
  it('does not leak Taste of Andhra UPI to another restaurant', () => {
    expect(
      envUpiFallback({ slug: 'chopsticksspicemalabar' }),
    ).toEqual({ vpa: '', payeeName: '' })
  })
})
