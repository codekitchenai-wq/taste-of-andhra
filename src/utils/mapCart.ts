import type { Cart, CartItem, CartWithItems } from '@/types/Cart'
import { mapDish } from '@/utils/mapDish'

export function mapCart(row: Record<string, unknown>): Cart {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function mapCartItem(row: Record<string, unknown>): CartItem {
  const dishRow = row.dishes as Record<string, unknown> | null

  return {
    id: row.id as string,
    cart_id: row.cart_id as string,
    dish_id: row.dish_id as string,
    quantity: Number(row.quantity),
    created_at: row.created_at as string,
    dish: dishRow ? mapDish(dishRow) : undefined,
  }
}

export function buildCartWithItems(
  cartRow: Record<string, unknown>,
): CartWithItems {
  const cart = mapCart(cartRow)
  const itemRows = (cartRow.cart_items as Record<string, unknown>[] | null) ?? []

  const items = itemRows
    .map(mapCartItem)
    .filter((item) => item.dish !== undefined)

  const subtotal = items.reduce(
    (total, item) => total + (item.dish?.price ?? 0) * item.quantity,
    0,
  )

  return {
    ...cart,
    items,
    subtotal,
  }
}

export function getCartItemCount(cart: CartWithItems | null): number {
  if (!cart) return 0

  return cart.items.reduce((count, item) => count + item.quantity, 0)
}
