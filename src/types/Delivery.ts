import type { OrderStatus } from './enums'

export interface Delivery {
  id: string
  order_id: string
  delivery_partner: string | null
  partner_phone: string | null
  status: OrderStatus
  assigned_at: string | null
  delivered_at: string | null
}
