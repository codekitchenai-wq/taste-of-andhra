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

export function calculateOrderTotals(
  subtotal: number,
  discount = 0,
): OrderTotals {
  const deliveryCharge =
    subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : ORDER_DELIVERY_CHARGE
  const tax = Math.round(subtotal * ORDER_TAX_RATE * 100) / 100
  const total = Math.round((subtotal + tax + deliveryCharge - discount) * 100) / 100

  return {
    subtotal,
    tax,
    deliveryCharge,
    discount,
    total,
  }
}
