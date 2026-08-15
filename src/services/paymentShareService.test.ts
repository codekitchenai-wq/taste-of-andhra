import { describe, expect, it } from 'vitest'
import {
  buildPaymentShareMessage,
  paymentSharePath,
  whatsappShareUrl,
} from './paymentShareService'

describe('paymentShareService', () => {
  it('builds a payment path from the share token', () => {
    expect(paymentSharePath('abc-123')).toBe('/pay/abc-123')
  })

  it('includes GST and order lines in the WhatsApp message', () => {
    const message = buildPaymentShareMessage(
      {
        orderNumber: 'TOA-1001',
        guestName: 'Ravi',
        fulfillmentType: 'pickup',
        items: [
          {
            name: 'Chicken Biryani',
            quantity: 2,
            unitPrice: 250,
            lineTotal: 500,
          },
        ],
        subtotal: 500,
        tax: 25,
        deliveryCharge: 0,
        discount: 0,
        total: 525,
      },
      'https://www.thetasteofandhra.com/pay/token',
    )

    expect(message).toContain('Order TOA-1001')
    expect(message).toContain('2× Chicken Biryani')
    expect(message).toContain('GST:')
    expect(message).toContain('Total:')
    expect(message).toContain('https://www.thetasteofandhra.com/pay/token')
  })

  it('builds a WhatsApp URL for an Indian mobile number', () => {
    const url = whatsappShareUrl('9876543210', 'Hello')
    expect(url).toContain('https://wa.me/919876543210?text=')
    expect(url).toContain(encodeURIComponent('Hello'))
  })
})
