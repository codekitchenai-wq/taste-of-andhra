import type { SpiceLevel } from './enums'

export interface Dish {
  id: string
  category_id: string
  name: string
  slug: string
  description: string | null
  ingredients: string | null
  price: number
  calories: number | null
  spice_level: SpiceLevel | null
  preparation_time: number | null
  image_url: string | null
  is_veg: boolean
  is_available: boolean
  is_featured: boolean
  rating: number | null
  created_at: string
  updated_at: string
}
