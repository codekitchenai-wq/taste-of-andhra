import type { OrderStatus } from './enums'

export interface Delivery {
  id: string
  order_id: string
  delivery_partner: string | null
  partner_phone: string | null
  partner_user_id: string | null
  status: OrderStatus
  assigned_at: string | null
  delivered_at: string | null
  current_lat: number | null
  current_lng: number | null
  location_updated_at: string | null
}
