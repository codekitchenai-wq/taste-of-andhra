import type {
  FulfillmentType,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from './enums'
import type { Address } from './Address'
import type { Dish } from './Dish'
import type { ModifierSelectionSnapshot } from './Modifier'
import type { Payment } from './Payment'

export interface Order {
  id: string
  organization_id: string
  order_number: string
  user_id: string | null
  address_id: string | null
  branch_id: string | null
  subtotal: number
  tax: number
  delivery_charge: number
  discount: number
  total: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  order_status: OrderStatus
  fulfillment_type: FulfillmentType
  order_source: OrderSource
  guest_name: string | null
  guest_phone: string | null
  guest_address_line1: string | null
  guest_address_line2: string | null
  guest_landmark: string | null
  guest_city: string | null
  guest_state: string | null
  guest_pincode: string | null
  special_instructions: string | null
  estimated_delivery: string | null
  /** Public token for /pay/:token (phone/counter payment share). */
  payment_share_token?: string | null
  /** Customer consented to WhatsApp order-status updates at checkout. */
  whatsapp_updates_opt_in: boolean
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  dish_id: string
  quantity: number
  /** Unit price at order time (includes modifiers). */
  price: number
  total: number
  dish_name_snapshot: string | null
  modifiers_snapshot: ModifierSelectionSnapshot[]
  dish?: Dish
}

export interface OrderWithDetails extends Order {
  items: OrderItem[]
}

export interface OrderFullDetails extends OrderWithDetails {
  address: Address | null
  payment: Payment | null
}
