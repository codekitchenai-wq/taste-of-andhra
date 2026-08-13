import {
  FREE_DELIVERY_THRESHOLD,
  ORDER_DELIVERY_CHARGE,
  ORDER_TAX_RATE,
} from '@/constants/ORDER'

export interface OrderTotals {
  subtotal: number
  tax: number
  deliveryCharge: number
  discount: number
  total: number
}

/** The built-in rate card, used when no provider quote is available. */
export function defaultDeliveryCharge(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : ORDER_DELIVERY_CHARGE
}

export function calculateOrderTotals(
  subtotal: number,
  discount = 0,
  deliveryCharge?: number,
  taxRate: number = ORDER_TAX_RATE,
): OrderTotals {
  const resolvedDelivery = deliveryCharge ?? defaultDeliveryCharge(subtotal)
  const tax = Math.round(subtotal * taxRate * 100) / 100
  const total =
    Math.round((subtotal + tax + resolvedDelivery - discount) * 100) / 100

  return {
    subtotal,
    tax,
    deliveryCharge: resolvedDelivery,
    discount,
    total: Math.max(0, total),
  }
}
