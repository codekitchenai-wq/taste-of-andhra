import { describe, expect, it } from 'vitest'
import {
  calculateGstInvoiceAmounts,
  generateGstInvoiceNumber,
} from './gstInvoice'

describe('generateGstInvoiceNumber', () => {
  it('prefixes the full order number so numbers stay unique per org', () => {
    expect(generateGstInvoiceNumber('TOA-20260813-4827')).toBe(
      'INV-TOA-20260813-4827',
    )
  })

  it('trims whitespace', () => {
    expect(generateGstInvoiceNumber('  TOA-1001  ')).toBe('INV-TOA-1001')
  })
})

describe('calculateGstInvoiceAmounts', () => {
  it('splits 5% GST into CGST and SGST on the taxable amount', () => {
    const result = calculateGstInvoiceAmounts({
      subtotal: 400,
      discount: 0,
      delivery_charge: 49,
    })

    expect(result.taxable_amount).toBe(400)
    expect(result.cgst).toBe(10)
    expect(result.sgst).toBe(10)
    expect(result.igst).toBe(0)
    expect(result.total).toBe(469)
  })

  it('subtracts discount before tax and never goes negative', () => {
    const discounted = calculateGstInvoiceAmounts({
      subtotal: 500,
      discount: 50,
      delivery_charge: 0,
    })
    expect(discounted.taxable_amount).toBe(450)
    expect(discounted.cgst).toBe(11.25)
    expect(discounted.sgst).toBe(11.25)
    expect(discounted.total).toBe(472.5)

    const clamped = calculateGstInvoiceAmounts({
      subtotal: 100,
      discount: 150,
      delivery_charge: 49,
    })
    expect(clamped.taxable_amount).toBe(0)
    expect(clamped.cgst).toBe(0)
    expect(clamped.sgst).toBe(0)
    expect(clamped.total).toBe(49)
  })
})
