import type { Order, OrderItem } from '@/types/Order'
import { mapDish } from '@/utils/mapDish'

export function mapOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    order_number: row.order_number as string,
    user_id: row.user_id as string,
    address_id: row.address_id as string,
    branch_id: (row.branch_id as string | null) ?? null,
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    delivery_charge: Number(row.delivery_charge),
    discount: Number(row.discount),
    total: Number(row.total),
    payment_method: row.payment_method as Order['payment_method'],
    payment_status: row.payment_status as Order['payment_status'],
    order_status: row.order_status as Order['order_status'],
    special_instructions: (row.special_instructions as string | null) ?? null,
    estimated_delivery: (row.estimated_delivery as string | null) ?? null,
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
    dish: dishRow ? mapDish(dishRow) : undefined,
  }
}

export function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(1000 + Math.random() * 9000)

  return `TOA-${datePart}-${random}`
}
