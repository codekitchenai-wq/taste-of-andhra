import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { OrderStatus, PaymentMethod } from '@/types/enums'
import type { Order, OrderWithDetails } from '@/types/Order'
import * as cartService from '@/services/cartService'
import { supabase } from '@/services/supabaseClient'
import { generateOrderNumber, mapOrder, mapOrderItem } from '@/utils/mapOrder'
import { calculateOrderTotals } from '@/utils/orderTotals'

export interface CreateOrderInput {
  addressId: string
  paymentMethod: PaymentMethod
  specialInstructions?: string
}

async function requireUserId(): Promise<ServiceResponse<string>> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return createErrorResponse('Unable to verify your session.', error.message)
  }

  if (!user) {
    return createErrorResponse('Please sign in to place an order.')
  }

  return createSuccessResponse(user.id)
}

export async function getCustomerOrders(): Promise<
  ServiceResponse<Order[]>
> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userResult.data)
    .order('created_at', { ascending: false })

  if (error) {
    return createErrorResponse('Unable to load orders.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapOrder))
}

export async function getOrderDetails(
  orderId: string,
): Promise<ServiceResponse<OrderWithDetails>> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      order_items (
        *,
        dishes (*)
      )
    `,
    )
    .eq('id', orderId)
    .eq('user_id', userResult.data)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load order.', error.message)
  }

  if (!data) {
    return createErrorResponse('Order not found.')
  }

  const order = mapOrder(data)
  const itemRows =
    (data.order_items as Record<string, unknown>[] | null) ?? []

  return createSuccessResponse({
    ...order,
    items: itemRows.map(mapOrderItem),
  })
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<ServiceResponse<Order>> {
  if (input.paymentMethod !== 'cod') {
    return createErrorResponse('Only Cash on Delivery is available right now.')
  }

  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const userId = userResult.data
  const cartResult = await cartService.getCart()

  if (!cartResult.success) {
    return cartResult
  }

  const cart = cartResult.data

  if (cart.items.length === 0) {
    return createErrorResponse('Your cart is empty.')
  }

  const unavailableItem = cart.items.find((item) => !item.dish?.is_available)

  if (unavailableItem) {
    return createErrorResponse(
      `${unavailableItem.dish?.name ?? 'An item'} is no longer available.`,
    )
  }

  const { data: address, error: addressError } = await supabase
    .from('addresses')
    .select('id')
    .eq('id', input.addressId)
    .eq('user_id', userId)
    .maybeSingle()

  if (addressError) {
    return createErrorResponse('Unable to verify address.', addressError.message)
  }

  if (!address) {
    return createErrorResponse('Please select a valid delivery address.')
  }

  const totals = calculateOrderTotals(cart.subtotal)
  const orderNumber = generateOrderNumber()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: userId,
      address_id: input.addressId,
      subtotal: totals.subtotal,
      tax: totals.tax,
      delivery_charge: totals.deliveryCharge,
      discount: totals.discount,
      total: totals.total,
      payment_method: input.paymentMethod,
      payment_status: 'pending',
      order_status: 'pending',
      special_instructions: input.specialInstructions?.trim() || null,
    })
    .select()
    .single()

  if (orderError) {
    return createErrorResponse('Unable to create order.', orderError.message)
  }

  const orderItems = cart.items.map((item) => ({
    order_id: order.id,
    dish_id: item.dish_id,
    quantity: item.quantity,
    price: item.dish!.price,
    total: item.dish!.price * item.quantity,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)

  if (itemsError) {
    return createErrorResponse('Unable to create order items.', itemsError.message)
  }

  const { error: paymentError } = await supabase.from('payments').insert({
    order_id: order.id,
    payment_gateway: 'cod',
    amount: totals.total,
    status: 'pending',
  })

  if (paymentError) {
    return createErrorResponse('Unable to create payment record.', paymentError.message)
  }

  await cartService.clearCart()

  return createSuccessResponse(mapOrder(order))
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<ServiceResponse<Order>> {
  const { data, error } = await supabase
    .from('orders')
    .update({ order_status: status })
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to update order status.', error.message)
  }

  return createSuccessResponse(mapOrder(data))
}

export async function cancelOrder(
  orderId: string,
): Promise<ServiceResponse<Order>> {
  return updateOrderStatus(orderId, 'cancelled')
}
