import { describe, expect, it } from 'vitest'
import {
  buildPrintTicketPayload,
  buildTicketText,
} from '@/utils/printTickets'
import type { AdminOrder } from '@/services/orderService'

const baseOrder = {
  id: 'ord-1',
  organization_id: 'org-1',
  order_number: 'TOA-1001',
  user_id: null,
  address_id: null,
  branch_id: null,
  subtotal: 250,
  tax: 0,
  delivery_charge: 30,
  discount: 0,
  total: 280,
  payment_method: 'cod',
  payment_status: 'pending',
  order_status: 'confirmed',
  fulfillment_type: 'delivery',
  order_source: 'app',
  guest_name: null,
  guest_phone: null,
  guest_address_line1: '12 MG Road',
  guest_address_line2: null,
  guest_landmark: null,
  guest_city: 'Hyderabad',
  guest_state: 'TG',
  guest_pincode: '500001',
  special_instructions: 'Less spicy',
  estimated_delivery: null,
  whatsapp_updates_opt_in: false,
  created_at: '2026-08-09T10:00:00.000Z',
  updated_at: '2026-08-09T10:00:00.000Z',
  customer_name: 'Ravi',
  customer_email: '',
  customer_phone: '9876543210',
  items: [
    {
      quantity: 2,
      name: 'Chicken Biryani',
      unitPrice: 125,
      modifiers: ['Extra raita'],
    },
  ],
  delivery_partner: null,
  partner_phone: null,
} satisfies AdminOrder

describe('printTickets', () => {
  it('builds a kitchen KOT without prices', () => {
    const payload = buildPrintTicketPayload(baseOrder, 'kitchen')
    const text = buildTicketText(payload)

    expect(text).toContain('KITCHEN KOT')
    expect(text).toContain('TOA-1001')
    expect(text).toContain('2x Chicken Biryani')
    expect(text).toContain('Extra raita')
    expect(text).toContain('Less spicy')
    expect(text).not.toContain('TOTAL')
    expect(text).not.toContain('₹')
  })

  it('builds a billing receipt with totals', () => {
    const payload = buildPrintTicketPayload(baseOrder, 'billing')
    const text = buildTicketText(payload)

    expect(text).toContain('BILL / RECEIPT')
    expect(text).toContain('TOTAL')
    expect(text).toContain('Cash on Delivery')
    expect(text).toContain('12 MG Road')
  })
})
