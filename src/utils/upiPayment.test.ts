import { describe, expect, it } from 'vitest'
import {
  buildUpiPayUrl,
  canShowPayLaterQr,
} from './upiPayment'

describe('upiPayment', () => {
  it('builds a UPI intent URL with amount', () => {
    const url = buildUpiPayUrl({
      vpa: 'shop@upi',
      payeeName: 'Taste',
      amount: 250.5,
      note: 'TOA-1',
    })
    expect(url).toContain('upi://pay?')
    expect(url).toContain('pa=shop%40upi')
    expect(url).toContain('am=250.50')
  })

  it('shows QR for pending pay-later at any active kitchen status', () => {
    expect(
      canShowPayLaterQr({
        paymentMethod: 'pay_later',
        paymentStatus: 'pending',
        orderStatus: 'pending',
        fulfillmentType: 'delivery',
      }),
    ).toBe(true)
    expect(
      canShowPayLaterQr({
        paymentMethod: 'pay_later',
        paymentStatus: 'pending',
        orderStatus: 'ready',
        fulfillmentType: 'pickup',
      }),
    ).toBe(true)
  })

  it('hides QR when paid or cancelled', () => {
    expect(
      canShowPayLaterQr({
        paymentMethod: 'pay_later',
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        fulfillmentType: 'delivery',
      }),
    ).toBe(false)
    expect(
      canShowPayLaterQr({
        paymentMethod: 'pay_later',
        paymentStatus: 'pending',
        orderStatus: 'cancelled',
        fulfillmentType: 'delivery',
      }),
    ).toBe(false)
  })
})
