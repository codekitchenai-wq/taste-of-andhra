import type { Order, OrderItem } from '@/types/Order'
import { mapDish } from '@/utils/mapDish'
import { parseModifierSnapshots } from '@/utils/modifiers'

export function mapOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    organization_id: (row.organization_id as string) ?? '',
    order_number: row.order_number as string,
    user_id: (row.user_id as string | null) ?? null,
    address_id: (row.address_id as string | null) ?? null,
    branch_id: (row.branch_id as string | null) ?? null,
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    delivery_charge: Number(row.delivery_charge),
    discount: Number(row.discount),
    total: Number(row.total),
    payment_method: row.payment_method as Order['payment_method'],
    payment_status: row.payment_status as Order['payment_status'],
    order_status: row.order_status as Order['order_status'],
    fulfillment_type:
      (row.fulfillment_type as Order['fulfillment_type'] | null) ?? 'delivery',
    order_source: (row.order_source as Order['order_source'] | null) ?? 'app',
    guest_name: (row.guest_name as string | null) ?? null,
    guest_phone: (row.guest_phone as string | null) ?? null,
    guest_address_line1: (row.guest_address_line1 as string | null) ?? null,
    guest_address_line2: (row.guest_address_line2 as string | null) ?? null,
    guest_landmark: (row.guest_landmark as string | null) ?? null,
    guest_city: (row.guest_city as string | null) ?? null,
    guest_state: (row.guest_state as string | null) ?? null,
    guest_pincode: (row.guest_pincode as string | null) ?? null,
    special_instructions: (row.special_instructions as string | null) ?? null,
    estimated_delivery: (row.estimated_delivery as string | null) ?? null,
    payment_share_token: (row.payment_share_token as string | null) ?? null,
    payment_claimed_at: (row.payment_claimed_at as string | null) ?? null,
    payment_claim_note: (row.payment_claim_note as string | null) ?? null,
    whatsapp_updates_opt_in: Boolean(row.whatsapp_updates_opt_in),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function mapOrderItem(row: Record<string, unknown>): OrderItem {
  const dishRow = row.dishes as Record<string, unknown> | null

  return {
    id: row.id as string,
    order_id: row.order_id as string,
    dish_id: row.dish_id as string,
    quantity: Number(row.quantity),
    price: Number(row.price),
    total: Number(row.total),
    dish_name_snapshot: (row.dish_name_snapshot as string | null) ?? null,
    modifiers_snapshot: parseModifierSnapshots(row.modifiers_snapshot),
    dish: dishRow ? mapDish(dishRow) : undefined,
  }
}

/** @deprecated Prefer importing from `@/utils/orderNumber`. */
export { generateOrderNumber } from '@/utils/orderNumber'

export function formatGuestAddress(order: Order): string | null {
  if (!order.guest_address_line1) return null

  return [
    order.guest_address_line1,
    order.guest_address_line2,
    order.guest_landmark ? `Near ${order.guest_landmark}` : null,
    [order.guest_city, order.guest_state, order.guest_pincode]
      .filter(Boolean)
      .join(', '),
  ]
    .filter(Boolean)
    .join(', ')
}
