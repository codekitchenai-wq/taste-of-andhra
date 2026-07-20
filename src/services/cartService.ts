import type { ServiceResponse } from '@/types/api'
import type { CartWithItems } from '@/types/Cart'

export async function getCart(): Promise<ServiceResponse<CartWithItems>> {
  throw new Error('Not implemented')
}

export async function addCartItem(
  _dishId: string,
  _quantity: number,
): Promise<ServiceResponse<CartWithItems>> {
  throw new Error('Not implemented')
}

export async function updateCartItemQuantity(
  _cartItemId: string,
  _quantity: number,
): Promise<ServiceResponse<CartWithItems>> {
  throw new Error('Not implemented')
}

export async function removeCartItem(
  _cartItemId: string,
): Promise<ServiceResponse<CartWithItems>> {
  throw new Error('Not implemented')
}

export async function clearCart(): Promise<ServiceResponse<null>> {
  throw new Error('Not implemented')
}
