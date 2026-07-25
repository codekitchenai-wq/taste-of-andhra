import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import type { OrderStatus } from '@/types/enums'

/** Forward kitchen/delivery sequence (cancellation is a side exit). */
const ALLOWED_NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
}

export function getAllowedNextStatuses(
  current: OrderStatus,
): readonly OrderStatus[] {
  return ALLOWED_NEXT[current]
}

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return true
  return ALLOWED_NEXT[from].includes(to)
}

export function getOrderStatusTransitionError(
  from: OrderStatus,
  to: OrderStatus,
): string | null {
  if (canTransitionOrderStatus(from, to)) return null

  const allowed = ALLOWED_NEXT[from]
  if (allowed.length === 0) {
    return `Order is already ${ORDER_STATUS[from]} and cannot be changed.`
  }

  return `Orders must follow Confirmed → Preparing → Ready → Out for Delivery. From ${ORDER_STATUS[from]}, next step is ${allowed
    .filter((status) => status !== 'cancelled')
    .map((status) => ORDER_STATUS[status])
    .join(' or ') || ORDER_STATUS[allowed[0]]}.`
}
