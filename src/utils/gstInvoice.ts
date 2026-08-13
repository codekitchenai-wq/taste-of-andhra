import { GST_CGST_RATE, GST_SGST_RATE } from '@/constants/LOYALTY'

export interface GstInvoiceAmounts {
  taxable_amount: number
  cgst: number
  sgst: number
  igst: number
  total: number
}

/** Stable per-order number; unique under (organization_id, invoice_number). */
export function generateGstInvoiceNumber(orderNumber: string): string {
  return `INV-${orderNumber.trim()}`
}

export function calculateGstInvoiceAmounts(input: {
  subtotal: number
  discount: number
  delivery_charge: number
}): GstInvoiceAmounts {
  const taxable =
    Math.round(Math.max(0, input.subtotal - input.discount) * 100) / 100
  const cgst = Math.round(taxable * GST_CGST_RATE * 100) / 100
  const sgst = Math.round(taxable * GST_SGST_RATE * 100) / 100
  const total =
    Math.round((taxable + cgst + sgst + input.delivery_charge) * 100) / 100

  return {
    taxable_amount: taxable,
    cgst,
    sgst,
    igst: 0,
    total,
  }
}
