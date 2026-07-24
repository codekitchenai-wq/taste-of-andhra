import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { OrderStatus, PaymentMethod } from '@/types/enums'
import type { Order, OrderFullDetails } from '@/types/Order'
import * as cartService from '@/services/cartService'
import { supabase } from '@/services/supabaseClient'
import { generateOrderNumber, mapOrder, mapOrderItem } from '@/utils/mapOrder'
import { mapAddress } from '@/utils/mapAddress'
import { mapPayment } from '@/utils/mapPayment'
import * as offerService from '@/services/offerService'
import { calculateOrderTotals } from '@/utils/orderTotals'

export interface CreateOrderInput {
  addressId: string
  paymentMethod: PaymentMethod
  specialInstructions?: string
  couponCode?: string
}

export interface AdminOrderItemSummary {
  quantity: number
  name: string
}

export interface AdminOrder extends Order {
  customer_name: string
  customer_email: string
  customer_phone: string | null
  items: AdminOrderItemSummary[]
  delivery_partner: string | null
  partner_phone: string | null
}

export interface AdminOrderFilters {
  status?: OrderStatus
  search?: string
  limit?: number
}

function mapAdminOrder(row: Record<string, unknown>): AdminOrder {
  const profile = row.profiles as {
    full_name: string
    email: string
    phone?: string | null
  } | null

  const itemRows =
    (row.order_items as
      | {
          quantity: number
          dishes: { name: string } | null
        }[]
      | null) ?? []

  const deliveryRaw = row.delivery as
    | {
        delivery_partner: string | null
        partner_phone: string | null
      }
    | {
        delivery_partner: string | null
        partner_phone: string | null
      }[]
    | null

  const delivery = Array.isArray(deliveryRaw) ? deliveryRaw[0] : deliveryRaw

  return {
    ...mapOrder(row),
    customer_name: profile?.full_name ?? 'Unknown',
    customer_email: profile?.email ?? '',
    customer_phone: profile?.phone ?? null,
    items: itemRows.map((item) => ({
      quantity: Number(item.quantity),
      name: item.dishes?.name ?? 'Item',
    })),
    delivery_partner: delivery?.delivery_partner ?? null,
    partner_phone: delivery?.partner_phone ?? null,
  }
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

const ORDER_DETAILS_SELECT = `
  *,
  order_items (
    *,
    dishes (*)
  ),
  addresses (*),
  payments (*)
`

function buildOrderFullDetails(row: Record<string, unknown>): OrderFullDetails {
  const order = mapOrder(row)
  const itemRows = (row.order_items as Record<string, unknown>[] | null) ?? []
  const addressRow = row.addresses as Record<string, unknown> | null
  const paymentRows = row.payments as Record<string, unknown>[] | null

  return {
    ...order,
    items: itemRows.map(mapOrderItem),
    address: addressRow ? mapAddress(addressRow) : null,
    payment: paymentRows?.[0] ? mapPayment(paymentRows[0]) : null,
  }
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
): Promise<ServiceResponse<OrderFullDetails>> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_DETAILS_SELECT)
    .eq('id', orderId)
    .eq('user_id', userResult.data)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load order.', error.message)
  }

  if (!data) {
    return createErrorResponse('Order not found.')
  }

  return createSuccessResponse(buildOrderFullDetails(data))
}

export async function getAdminOrderDetails(
  orderId: string,
): Promise<ServiceResponse<OrderFullDetails>> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_DETAILS_SELECT)
    .eq('id', orderId)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load order.', error.message)
  }

  if (!data) {
    return createErrorResponse('Order not found.')
  }

  return createSuccessResponse(buildOrderFullDetails(data))
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<ServiceResponse<Order>> {
  if (input.paymentMethod !== 'cod' && input.paymentMethod !== 'razorpay') {
    return createErrorResponse('Unsupported payment method.')
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

  let discount = 0

  if (input.couponCode?.trim()) {
    const couponResult = await offerService.validateCoupon(
      input.couponCode,
      cart.subtotal,
    )

    if (!couponResult.success) {
      return createErrorResponse(couponResult.message, couponResult.error)
    }

    discount = couponResult.data.discountAmount
  }

  const totals = calculateOrderTotals(cart.subtotal, discount)
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
    payment_gateway: input.paymentMethod === 'razorpay' ? 'razorpay' : 'cod',
    amount: totals.total,
    status: 'pending',
  })

  if (paymentError) {
    return createErrorResponse('Unable to create payment record.', paymentError.message)
  }

  return createSuccessResponse(mapOrder(order))
}

const ADMIN_ORDERS_SELECT = `
  *,
  profiles(full_name, email, phone),
  order_items(
    quantity,
    dishes(name)
  ),
  delivery(delivery_partner, partner_phone)
`

export async function getAllOrders(
  filters?: AdminOrderFilters,
): Promise<ServiceResponse<AdminOrder[]>> {
  let query = supabase
    .from('orders')
    .select(ADMIN_ORDERS_SELECT)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('order_status', filters.status)
  }

  if (filters?.search?.trim()) {
    query = query.ilike('order_number', `%${filters.search.trim()}%`)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    return createErrorResponse('Unable to load orders.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapAdminOrder))
}

/** Subscribe to order INSERT/UPDATE for live kitchen board refreshes. */
export function subscribeToOrders(onChange: () => void): () => void {
  const channel = supabase
    .channel('admin-kitchen-orders')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders' },
      () => onChange(),
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
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
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('order_status')
    .eq('id', orderId)
    .eq('user_id', userResult.data)
    .maybeSingle()

  if (fetchError) {
    return createErrorResponse('Unable to load order.', fetchError.message)
  }

  if (!order) {
    return createErrorResponse('Order not found.')
  }

  if (
    order.order_status !== 'pending' &&
    order.order_status !== 'confirmed'
  ) {
    return createErrorResponse(
      'Orders can only be cancelled before preparation starts.',
    )
  }

  return updateOrderStatus(orderId, 'cancelled')
}
