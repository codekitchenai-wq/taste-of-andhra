import type { OrderStatus, PaymentMethod, PaymentStatus } from './enums'
import type { Dish } from './Dish'

export interface Order {
  id: string
  order_number: string
  user_id: string
  address_id: string
  subtotal: number
  tax: number
  delivery_charge: number
  discount: number
  total: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  order_status: OrderStatus
  special_instructions: string | null
  estimated_delivery: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  dish_id: string
  quantity: number
  price: number
  total: number
  dish?: Dish
}

export interface OrderWithDetails extends Order {
  items: OrderItem[]
}
