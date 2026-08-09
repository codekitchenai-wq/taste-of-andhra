import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { CartWithItems } from '@/types/Cart'
import type { ModifierSelectionSnapshot } from '@/types/Modifier'
import { supabase } from '@/services/supabaseClient'
import * as modifierService from '@/services/modifierService'
import { buildCartWithItems } from '@/utils/mapCart'
import {
  buildModifierSnapshots,
  calculateUnitPrice,
  modifierSnapshotsEqual,
  parseModifierSnapshots,
} from '@/utils/modifiers'

const CART_SELECT = `
  id,
  user_id,
  created_at,
  updated_at,
  cart_items (
    id,
    cart_id,
    dish_id,
    quantity,
    unit_price,
    modifiers_snapshot,
    created_at,
    dishes (*)
  )
`

async function requireUserId(): Promise<ServiceResponse<string>> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return createErrorResponse('Unable to verify your session.', error.message)
  }

  if (!user) {
    return createErrorResponse('Please sign in to manage your cart.')
  }

  return createSuccessResponse(user.id)
}

async function getOrCreateCartId(userId: string): Promise<ServiceResponse<string>> {
  const { data: existing, error: fetchError } = await supabase
    .from('cart')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (fetchError) {
    return createErrorResponse('Unable to load cart.', fetchError.message)
  }

  if (existing) {
    return createSuccessResponse(existing.id)
  }

  const { data, error } = await supabase
    .from('cart')
    .insert({ user_id: userId })
    .select('id')
    .single()

  if (error) {
    return createErrorResponse('Unable to create cart.', error.message)
  }

  return createSuccessResponse(data.id)
}

async function fetchCartById(cartId: string): Promise<ServiceResponse<CartWithItems>> {
  const { data, error } = await supabase
    .from('cart')
    .select(CART_SELECT)
    .eq('id', cartId)
    .single()

  if (
    error &&
    (error.message.toLowerCase().includes('unit_price') ||
      error.message.toLowerCase().includes('modifiers_snapshot') ||
      error.message.toLowerCase().includes('schema cache'))
  ) {
    const legacy = await supabase
      .from('cart')
      .select(
        `
      id,
      user_id,
      created_at,
      updated_at,
      cart_items (
        id,
        cart_id,
        dish_id,
        quantity,
        created_at,
        dishes (*)
      )
    `,
      )
      .eq('id', cartId)
      .single()

    if (legacy.error) {
      return createErrorResponse('Unable to load cart.', legacy.error.message)
    }

    return createSuccessResponse(buildCartWithItems(legacy.data))
  }

  if (error) {
    return createErrorResponse('Unable to load cart.', error.message)
  }

  return createSuccessResponse(buildCartWithItems(data))
}

export async function getCart(): Promise<ServiceResponse<CartWithItems>> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const cartResult = await getOrCreateCartId(userResult.data)

  if (!cartResult.success) {
    return cartResult
  }

  return fetchCartById(cartResult.data)
}

export async function addCartItem(
  dishId: string,
  quantity = 1,
  selectedModifierIds: string[] = [],
): Promise<ServiceResponse<CartWithItems>> {
  if (quantity < 1) {
    return createErrorResponse('Quantity must be at least 1.')
  }

  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const { data: dish, error: dishError } = await supabase
    .from('dishes')
    .select('id, is_available, price')
    .eq('id', dishId)
    .maybeSingle()

  if (dishError) {
    return createErrorResponse('Unable to verify dish.', dishError.message)
  }

  if (!dish || !dish.is_available) {
    return createErrorResponse('This dish is not available.')
  }

  const groupsResult = await modifierService.getDishModifierGroups(dishId)

  if (!groupsResult.success) {
    return groupsResult
  }

  const snapshotResult = buildModifierSnapshots(
    groupsResult.data,
    selectedModifierIds,
  )

  if (!snapshotResult.ok) {
    return createErrorResponse(snapshotResult.message)
  }

  const snapshots = snapshotResult.snapshots
  const unitPrice = calculateUnitPrice(Number(dish.price), snapshots)

  const cartResult = await getOrCreateCartId(userResult.data)

  if (!cartResult.success) {
    return cartResult
  }

  const cartId = cartResult.data

  const { data: existingItems, error: existingError } = await supabase
    .from('cart_items')
    .select('id, quantity, modifiers_snapshot')
    .eq('cart_id', cartId)
    .eq('dish_id', dishId)

  if (existingError) {
    return createErrorResponse('Unable to update cart.', existingError.message)
  }

  const match = (existingItems ?? []).find((item) =>
    modifierSnapshotsEqual(
      parseModifierSnapshots(item.modifiers_snapshot),
      snapshots,
    ),
  )

  if (match) {
    const { error } = await supabase
      .from('cart_items')
      .update({
        quantity: match.quantity + quantity,
        unit_price: unitPrice,
        modifiers_snapshot: snapshots,
      })
      .eq('id', match.id)

    if (error) {
      return createErrorResponse('Unable to update cart.', error.message)
    }
  } else {
    const insertPayload: Record<string, unknown> = {
      cart_id: cartId,
      dish_id: dishId,
      quantity,
      unit_price: unitPrice,
      modifiers_snapshot: snapshots,
    }

    const { error } = await supabase.from('cart_items').insert(insertPayload)

    if (error) {
      // Pre-migration DBs may lack new columns / still have unique(cart_id, dish_id).
      if (isMissingColumnError(error.message)) {
        const fallback = await addCartItemLegacy(cartId, dishId, quantity)
        if (!fallback.success) return fallback
        return fetchCartById(cartId)
      }

      return createErrorResponse('Unable to add item to cart.', error.message)
    }
  }

  return fetchCartById(cartId)
}

function isMissingColumnError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('modifiers_snapshot') ||
    normalized.includes('unit_price') ||
    normalized.includes('schema cache')
  )
}

async function addCartItemLegacy(
  cartId: string,
  dishId: string,
  quantity: number,
): Promise<ServiceResponse<null>> {
  const { data: existingItem, error: existingError } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('dish_id', dishId)
    .maybeSingle()

  if (existingError) {
    return createErrorResponse('Unable to update cart.', existingError.message)
  }

  if (existingItem) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existingItem.quantity + quantity })
      .eq('id', existingItem.id)

    if (error) {
      return createErrorResponse('Unable to update cart.', error.message)
    }
  } else {
    const { error } = await supabase.from('cart_items').insert({
      cart_id: cartId,
      dish_id: dishId,
      quantity,
    })

    if (error) {
      return createErrorResponse('Unable to add item to cart.', error.message)
    }
  }

  return createSuccessResponse(null)
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number,
): Promise<ServiceResponse<CartWithItems>> {
  if (quantity < 1) {
    return removeCartItem(cartItemId)
  }

  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const { data: cartItem, error: fetchError } = await supabase
    .from('cart_items')
    .select('id, cart_id')
    .eq('id', cartItemId)
    .maybeSingle()

  if (fetchError) {
    return createErrorResponse('Unable to update cart item.', fetchError.message)
  }

  if (!cartItem) {
    return createErrorResponse('Cart item not found.')
  }

  const { error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', cartItemId)

  if (error) {
    return createErrorResponse('Unable to update quantity.', error.message)
  }

  return fetchCartById(cartItem.cart_id)
}

export async function removeCartItem(
  cartItemId: string,
): Promise<ServiceResponse<CartWithItems>> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const { data: cartItem, error: fetchError } = await supabase
    .from('cart_items')
    .select('id, cart_id')
    .eq('id', cartItemId)
    .maybeSingle()

  if (fetchError) {
    return createErrorResponse('Unable to remove cart item.', fetchError.message)
  }

  if (!cartItem) {
    return createErrorResponse('Cart item not found.')
  }

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', cartItemId)

  if (error) {
    return createErrorResponse('Unable to remove item.', error.message)
  }

  return fetchCartById(cartItem.cart_id)
}

export async function clearCart(): Promise<ServiceResponse<null>> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const cartResult = await getOrCreateCartId(userResult.data)

  if (!cartResult.success) {
    return cartResult
  }

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cartResult.data)

  if (error) {
    return createErrorResponse('Unable to clear cart.', error.message)
  }

  return createSuccessResponse(null)
}

export type { ModifierSelectionSnapshot }
