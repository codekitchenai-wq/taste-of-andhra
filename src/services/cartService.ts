import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { CartWithItems } from '@/types/Cart'
import { supabase } from '@/services/supabaseClient'
import { buildCartWithItems } from '@/utils/mapCart'

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
    .select('id, is_available')
    .eq('id', dishId)
    .maybeSingle()

  if (dishError) {
    return createErrorResponse('Unable to verify dish.', dishError.message)
  }

  if (!dish || !dish.is_available) {
    return createErrorResponse('This dish is not available.')
  }

  const cartResult = await getOrCreateCartId(userResult.data)

  if (!cartResult.success) {
    return cartResult
  }

  const cartId = cartResult.data

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

  return fetchCartById(cartId)
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
