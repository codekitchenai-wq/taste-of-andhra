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

  it('shows QR after ready for pickup pay-later', () => {
    expect(
      canShowPayLaterQr({
        paymentMethod: 'pay_later',
        paymentStatus: 'pending',
        orderStatus: 'ready',
        fulfillmentType: 'pickup',
      }),
    ).toBe(true)
  })

  it('hides QR until out for delivery for delivery pay-later', () => {
    expect(
      canShowPayLaterQr({
        paymentMethod: 'pay_later',
        paymentStatus: 'pending',
        orderStatus: 'ready',
        fulfillmentType: 'delivery',
      }),
    ).toBe(false)
    expect(
      canShowPayLaterQr({
        paymentMethod: 'pay_later',
        paymentStatus: 'pending',
        orderStatus: 'delivered',
        fulfillmentType: 'delivery',
      }),
    ).toBe(true)
  })
})
