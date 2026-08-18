import { describe, expect, it } from 'vitest'
import type { AdminOrder } from '@/services/orderService'
import {
  groupOnamOrdersBySlot,
  isOnamOrder,
  onamCelebrationDateKey,
  onamPlatesFromOrder,
  onamSlotValueFromEstimated,
} from './onamOrder'

function makeOrder(partial: Partial<AdminOrder>): AdminOrder {
  return {
    id: '1',
    organization_id: 'org',
    order_number: 'SM-001',
    user_id: null,
    address_id: null,
    branch_id: null,
    subtotal: 720,
    tax: 0,
    delivery_charge: 0,
    discount: 0,
    total: 720,
    payment_method: 'pay_later',
    payment_status: 'pending',
    order_status: 'pending',
    fulfillment_type: 'delivery',
    order_source: 'app',
    guest_name: null,
    guest_phone: null,
    guest_address_line1: null,
    guest_address_line2: null,
    guest_landmark: null,
    guest_city: null,
    guest_state: null,
    guest_pincode: null,
    special_instructions: null,
    estimated_delivery: null,
    whatsapp_updates_opt_in: false,
    created_at: '2026-08-18T10:00:00.000Z',
    updated_at: '2026-08-18T10:00:00.000Z',
    customer_name: 'Test',
    customer_email: 'test@example.com',
    customer_phone: '+91 90000 00000',
    items: [],
    delivery_partner: null,
    partner_phone: null,
    ...partial,
  }
}

describe('isOnamOrder', () => {
  it('detects pre-book note marker', () => {
    expect(
      isOnamOrder({
        special_instructions: 'ONAM SADHYA PRE-BOOK\nPlates: 2',
        items: [],
      }),
    ).toBe(true)
  })

  it('detects Onam dish line items', () => {
    expect(
      isOnamOrder({
        items: [{ name: 'Onam Sadhya (Parcel)' }],
      }),
    ).toBe(true)
  })
})

describe('onamPlatesFromOrder', () => {
  it('sums Onam line quantities', () => {
    expect(
      onamPlatesFromOrder(
        makeOrder({
          items: [{ name: 'Onam Sadhya (Parcel)', quantity: 3 }],
        }),
      ),
    ).toBe(3)
  })
})

describe('onamCelebrationDateKey', () => {
  it('uses IST calendar date', () => {
    expect(onamCelebrationDateKey('2026-08-25T05:30:00.000Z')).toBe(
      '2026-08-25',
    )
  })
})

describe('onamSlotValueFromEstimated', () => {
  it('returns slot start in IST', () => {
    expect(onamSlotValueFromEstimated('2026-08-25T05:30:00.000Z')).toBe(
      '11:00',
    )
  })
})

describe('groupOnamOrdersBySlot', () => {
  it('groups and totals plates per slot', () => {
    const groups = groupOnamOrdersBySlot([
      makeOrder({
        id: 'a',
        estimated_delivery: '2026-08-25T05:30:00.000Z',
        items: [{ name: 'Onam Sadhya (Parcel)', quantity: 2 }],
      }),
      makeOrder({
        id: 'b',
        estimated_delivery: '2026-08-25T06:30:00.000Z',
        payment_status: 'paid',
        items: [{ name: 'Onam Sadhya (Parcel)', quantity: 1 }],
      }),
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0]?.totalPlates).toBe(2)
    expect(groups[1]?.paidOrders).toBe(1)
  })
})
