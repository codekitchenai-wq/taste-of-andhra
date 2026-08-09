import type { Dish } from './Dish'
import type { ModifierSelectionSnapshot } from './Modifier'

export interface Cart {
  id: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  cart_id: string
  dish_id: string
  quantity: number
  /** Dish base + modifier deltas at add time. */
  unit_price: number
  modifiers_snapshot: ModifierSelectionSnapshot[]
  created_at: string
  dish?: Dish
}

export interface CartWithItems extends Cart {
  items: CartItem[]
  subtotal: number
}
