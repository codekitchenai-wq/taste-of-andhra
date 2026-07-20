export interface Review {
  id: string
  dish_id: string
  user_id: string
  rating: number
  review: string | null
  created_at: string
}
