import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import type { FulfillmentType, OrderStatus } from '@/types/enums'

/** Forward kitchen/delivery sequence (cancellation is a side exit). */
const DELIVERY_NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
}

/** Pickup skips rider assignment — ready means collectible. */
const PICKUP_NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
}

export function getAllowedNextStatuses(
  current: OrderStatus,
  fulfillmentType: FulfillmentType = 'delivery',
): readonly OrderStatus[] {
  return fulfillmentType === 'pickup'
    ? PICKUP_NEXT[current]
    : DELIVERY_NEXT[current]
}

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
  fulfillmentType: FulfillmentType = 'delivery',
): boolean {
  if (from === to) return true
  return getAllowedNextStatuses(from, fulfillmentType).includes(to)
}

export function getOrderStatusTransitionError(
  from: OrderStatus,
  to: OrderStatus,
  fulfillmentType: FulfillmentType = 'delivery',
): string | null {
  if (canTransitionOrderStatus(from, to, fulfillmentType)) return null

  const allowed = getAllowedNextStatuses(from, fulfillmentType)
  if (allowed.length === 0) {
    return `Order is already ${ORDER_STATUS[from]} and cannot be changed.`
  }

  const pathLabel =
    fulfillmentType === 'pickup'
      ? 'Confirmed → Preparing → Ready → Picked Up'
      : 'Confirmed → Preparing → Ready → Out for Delivery'

  return `Orders must follow ${pathLabel}. From ${ORDER_STATUS[from]}, next step is ${allowed
    .filter((status) => status !== 'cancelled')
    .map((status) => ORDER_STATUS[status])
    .join(' or ') || ORDER_STATUS[allowed[0]]}.`
}
