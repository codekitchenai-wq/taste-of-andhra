import type { Cart, CartItem, CartWithItems } from '@/types/Cart'
import { mapDish } from '@/utils/mapDish'
import {
  calculateUnitPrice,
  parseModifierSnapshots,
} from '@/utils/modifiers'

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
  const dish = dishRow ? mapDish(dishRow) : undefined
  const modifiers_snapshot = parseModifierSnapshots(row.modifiers_snapshot)
  const storedUnit =
    row.unit_price !== null && row.unit_price !== undefined
      ? Number(row.unit_price)
      : null

  return {
    id: row.id as string,
    cart_id: row.cart_id as string,
    dish_id: row.dish_id as string,
    quantity: Number(row.quantity),
    unit_price:
      storedUnit !== null && !Number.isNaN(storedUnit)
        ? storedUnit
        : calculateUnitPrice(dish?.price ?? 0, modifiers_snapshot),
    modifiers_snapshot,
    created_at: row.created_at as string,
    dish,
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
    (total, item) => total + item.unit_price * item.quantity,
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
