export interface Offer {
  id: string
  title: string
  description: string | null
  discount_percentage: number
  minimum_order: number
  coupon_code: string | null
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}
