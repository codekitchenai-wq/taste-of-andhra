import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { FulfillmentType, OrderStatus, PaymentMethod } from '@/types/enums'
import type { Order, OrderFullDetails } from '@/types/Order'
import * as branchService from '@/services/branchService'
import * as cartService from '@/services/cartService'
import * as loyaltyService from '@/services/loyaltyService'
import * as notificationService from '@/services/notificationService'
import { supabase } from '@/services/supabaseClient'
import { generateOrderNumber, mapOrder, mapOrderItem } from '@/utils/mapOrder'
import { mapAddress } from '@/utils/mapAddress'
import { mapPayment } from '@/utils/mapPayment'
import * as offerService from '@/services/offerService'
import * as settingsService from '@/services/settingsService'
import { requestPidgeCancel } from '@/services/deliveryQuoteService'
import { DEFAULT_ETA_MINUTES, ORDER_TAX_RATE } from '@/constants/ORDER'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { calculateOrderTotals, defaultDeliveryCharge } from '@/utils/orderTotals'
import { addMinutesToIso } from '@/utils/orderEta'
import { getOrderStatusTransitionError } from '@/utils/orderStatusTransitions'
import {
  isMissingColumnError,
  withoutOrganizationId,
} from '@/utils/supabaseSchema'
import { getStoreOpenStatus } from '@/utils/storeHours'
import { effectiveOrderTaxRate } from '@/utils/gstSettings'

export interface CreateOrderInput {
  addressId: string
  paymentMethod: PaymentMethod
  specialInstructions?: string
  couponCode?: string
  branchId?: string
  loyaltyPointsToRedeem?: number
  /** Quote shown at checkout; its stored amount is what the customer pays. */
  deliveryQuoteId?: string | null
  /** Customer opted in to WhatsApp order-status updates. */
  whatsappUpdatesOptIn?: boolean
}

async function assertStoreAcceptingOrders(): Promise<ServiceResponse<true>> {
  const hoursResult = await settingsService.getStoreOperatingHours()
  if (!hoursResult.success) {
    return createErrorResponse(
      'Unable to verify store timings. Please try again.',
      hoursResult.error ?? hoursResult.message,
    )
  }

  const status = getStoreOpenStatus(hoursResult.data)
  if (!status.isOpen) {
    return createErrorResponse(status.reason)
  }

  return createSuccessResponse(true)
}

interface ResolvedDeliveryQuote {
  amount: number | null
  provider: string
  quoteId: string | null
}

const SERVICE_AREA_ERROR_PREFIX = 'OUTSIDE_SERVICE_AREA:'

/**
 * The orders trigger rejects addresses outside the service area. Its message
 * already reads like customer copy, so it is passed through rather than being
 * replaced by a generic failure.
 */
function serviceAreaErrorMessage(message: string): string | null {
  const index = message.indexOf(SERVICE_AREA_ERROR_PREFIX)

  if (index === -1) return null

  return (
    message.slice(index + SERVICE_AREA_ERROR_PREFIX.length).trim() ||
    'We do not deliver to this address yet.'
  )
}

function isMissingOrderItemColumnError(message: string): boolean {
  const msg = message.toLowerCase()
  return (
    msg.includes('modifiers_snapshot') ||
    msg.includes('dish_name_snapshot') ||
    msg.includes('schema cache')
  )
}

/** Drop columns named in a PostgREST "missing column" error so retries can succeed. */
export function stripMissingOrderColumns(
  payload: Record<string, unknown>,
  errorMessage: string,
): Record<string, unknown> {
  const msg = errorMessage.toLowerCase()
  let next = { ...payload }

  if (msg.includes('organization_id')) {
    next = withoutOrganizationId(next)
  }
  if (msg.includes('delivery_provider') || msg.includes('delivery_quote_id')) {
    const {
      delivery_provider: _provider,
      delivery_quote_id: _quoteId,
      ...rest
    } = next
    next = rest
  }
  if (msg.includes('branch_id')) {
    const { branch_id: _branchId, ...rest } = next
    next = rest
  }
  if (msg.includes('whatsapp_updates_opt_in')) {
    const { whatsapp_updates_opt_in: _wa, ...rest } = next
    next = rest
  }
  if (msg.includes('payment_share_token')) {
    const { payment_share_token: _token, ...rest } = next
    next = rest
  }
  if (
    msg.includes('fulfillment_type') ||
    msg.includes('order_source') ||
    msg.includes('guest_name') ||
    msg.includes('guest_phone') ||
    msg.includes('guest_address')
  ) {
    const {
      fulfillment_type: _ft,
      order_source: _os,
      guest_name: _gn,
      guest_phone: _gp,
      guest_address_line1: _ga1,
      guest_address_line2: _ga2,
      guest_landmark: _gl,
      guest_city: _gc,
      guest_state: _gs,
      guest_pincode: _gpc,
      ...rest
    } = next
    next = rest
  }

  return next
}

/**
 * Re-reads the quote from the database rather than trusting a client-supplied
 * price. An expired, already-used, or mismatched quote is ignored so the order
 * falls back to the rate card instead of failing.
 */
async function resolveDeliveryQuote(
  quoteId: string | null | undefined,
  userId: string,
  addressId: string,
): Promise<ResolvedDeliveryQuote> {
  const none: ResolvedDeliveryQuote = {
    amount: null,
    provider: 'own',
    quoteId: null,
  }

  if (!quoteId) return none

  const { data, error } = await supabase
    .from('delivery_quotes')
    .select('*')
    .eq('id', quoteId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return none
  if (data.address_id !== addressId) return none
  if (data.consumed_by_order_id) return none
  if (new Date(data.expires_at as string).getTime() < Date.now()) return none
  if (!data.is_serviceable) return none

  return {
    amount: Number(data.amount),
    provider: (data.provider as string) ?? 'own',
    quoteId: data.id as string,
  }
}

export interface AdminOrderItemSummary {
  quantity: number
  name: string
  unitPrice?: number
  modifiers?: string[]
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
  /** Inclusive ISO lower bound for `created_at`. */
  createdFrom?: string
  /** Inclusive ISO upper bound for `created_at`. */
  createdTo?: string
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
          price?: number | null
          dish_name_snapshot?: string | null
          modifiers_snapshot?:
            | { modifier_name?: string; price_delta?: number }[]
            | null
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
    customer_name:
      (row.guest_name as string | null)?.trim() ||
      profile?.full_name ||
      'Unknown',
    customer_email: profile?.email ?? '',
    customer_phone:
      (row.guest_phone as string | null)?.trim() || profile?.phone || null,
    items: itemRows.map((item) => {
      const modifiers = (item.modifiers_snapshot ?? [])
        .map((mod) => {
          const name = mod.modifier_name?.trim()
          if (!name) return null
          const delta =
            typeof mod.price_delta === 'number' && mod.price_delta !== 0
              ? ` (${mod.price_delta > 0 ? '+' : ''}${mod.price_delta})`
              : ''
          return `${name}${delta}`
        })
        .filter((value): value is string => Boolean(value))

      return {
        quantity: Number(item.quantity),
        name:
          item.dish_name_snapshot?.trim() || item.dishes?.name || 'Item',
        unitPrice:
          typeof item.price === 'number' ? Number(item.price) : undefined,
        modifiers: modifiers.length ? modifiers : undefined,
      }
    }),
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

  let loyaltyDiscount = 0
  let loyaltyPointsUsed = 0

  if (input.loyaltyPointsToRedeem && input.loyaltyPointsToRedeem > 0) {
    const accountResult = await loyaltyService.getOrCreateAccount(userId)
    if (!accountResult.success) return accountResult

    const maxRedeem = loyaltyService.maxRedeemableDiscount(
      accountResult.data.points_balance,
      Math.max(0, cart.subtotal - discount),
    )

    if (input.loyaltyPointsToRedeem > maxRedeem.points) {
      return createErrorResponse(
        `You can redeem up to ${maxRedeem.points} points on this order.`,
      )
    }

    loyaltyPointsUsed = input.loyaltyPointsToRedeem
    loyaltyDiscount = loyaltyService.pointsToRupees(loyaltyPointsUsed)
    discount += loyaltyDiscount
  }

  let branchId = input.branchId ?? null
  if (!branchId) {
    const defaultBranch = await branchService.getDefaultBranch()
    if (defaultBranch.success) {
      branchId = defaultBranch.data.id
    }
  }

  const openResult = await assertStoreAcceptingOrders()
  if (!openResult.success) {
    return openResult
  }

  const quote = await resolveDeliveryQuote(
    input.deliveryQuoteId,
    userId,
    input.addressId,
  )

  const gstSettings = await settingsService.getGstSettings()
  const taxRate = effectiveOrderTaxRate(
    gstSettings.success && gstSettings.data.enabled,
  )
  const totals = calculateOrderTotals(
    cart.subtotal,
    discount,
    quote.amount ?? undefined,
    taxRate,
  )
  const sequenceResult = await settingsService.getOrderNumberSequence(branchId)
  const orderNumber = generateOrderNumber(
    sequenceResult.success ? sequenceResult.data : undefined,
  )

  const etaResult = await settingsService.getDefaultEtaMinutes()
  const etaMinutes = etaResult.success ? etaResult.data : DEFAULT_ETA_MINUTES
  const estimatedDelivery = addMinutesToIso(new Date(), etaMinutes)

  const orderPayload: Record<string, unknown> = {
    organization_id: DEFAULT_ORGANIZATION_ID,
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
    fulfillment_type: 'delivery',
    order_source: 'app',
    special_instructions: input.specialInstructions?.trim() || null,
    estimated_delivery: estimatedDelivery,
    delivery_provider: quote.provider,
    delivery_quote_id: quote.quoteId,
    whatsapp_updates_opt_in: Boolean(input.whatsappUpdatesOptIn),
  }

  if (branchId) {
    orderPayload.branch_id = branchId
  }

  let { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select()
    .single()

  // Projects that have not applied newer migrations still need to take orders.
  // Object.assign cannot remove keys — rebuild the payload without missing columns.
  let compatPayload = orderPayload
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!orderError || !isMissingColumnError(orderError.message)) break

    compatPayload = stripMissingOrderColumns(compatPayload, orderError.message)
    const retry = await supabase
      .from('orders')
      .insert(compatPayload)
      .select()
      .single()

    order = retry.data
    orderError = retry.error
  }

  if (orderError || !order) {
    const outsideArea = orderError
      ? serviceAreaErrorMessage(orderError.message)
      : null

    return createErrorResponse(
      outsideArea ?? 'Unable to create order.',
      orderError?.message,
    )
  }

  if (quote.quoteId) {
    // Burn the quote so a stale price cannot be replayed on a second order.
    await supabase
      .from('delivery_quotes')
      .update({ consumed_by_order_id: order.id })
      .eq('id', quote.quoteId)
  }

  if (loyaltyPointsUsed > 0) {
    const redeemResult = await loyaltyService.redeemPoints(
      loyaltyPointsUsed,
      order.id as string,
    )
    if (!redeemResult.success) {
      await supabase.from('orders').delete().eq('id', order.id)
      return createErrorResponse(redeemResult.message, redeemResult.error)
    }
  }

  const orderItems = cart.items.map((item) => ({
    order_id: order.id,
    dish_id: item.dish_id,
    quantity: item.quantity,
    price: item.unit_price,
    total: item.unit_price * item.quantity,
    dish_name_snapshot: item.dish?.name ?? null,
    modifiers_snapshot: item.modifiers_snapshot ?? [],
  }))

  let { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)

  if (itemsError && isMissingOrderItemColumnError(itemsError.message)) {
    const legacyItems = cart.items.map((item) => ({
      order_id: order.id,
      dish_id: item.dish_id,
      quantity: item.quantity,
      price: item.unit_price ?? item.dish!.price,
      total: (item.unit_price ?? item.dish!.price) * item.quantity,
    }))

    const retry = await supabase.from('order_items').insert(legacyItems)
    itemsError = retry.error
  }

  if (itemsError) {
    return createErrorResponse('Unable to create order items.', itemsError.message)
  }

  const paymentGateway =
    input.paymentMethod === 'razorpay' ? 'razorpay' : 'cod'
  const { error: paymentError } = await supabase.from('payments').insert({
    order_id: order.id,
    organization_id:
      (order.organization_id as string | undefined) ?? DEFAULT_ORGANIZATION_ID,
    payment_gateway: paymentGateway,
    provider: paymentGateway === 'razorpay' ? 'razorpay' : 'cod',
    payment_mode: 'DIRECT',
    amount: totals.total,
    status: 'pending',
  })

  if (paymentError) {
    return createErrorResponse('Unable to create payment record.', paymentError.message)
  }

  void notificationService.notifyOrderStatus(
    userId,
    order.id as string,
    orderNumber,
    'pending',
  )

  return createSuccessResponse(mapOrder(order))
}

export interface PhoneOrderItemInput {
  dishId: string
  quantity: number
  /** Snapshot unit price (dish price; modifiers not required for phone take). */
  unitPrice: number
  dishName: string
}

export interface CreatePhoneOrderInput {
  customerName: string
  customerPhone: string
  /** When set, order is linked to an existing customer profile. */
  userId?: string | null
  fulfillmentType: FulfillmentType
  /** Existing customer address for delivery. */
  addressId?: string | null
  /** Inline guest delivery address when no saved address is used. */
  guestAddress?: {
    line1: string
    line2?: string
    landmark?: string
    city: string
    state: string
    pincode: string
  } | null
  branchId?: string | null
  specialInstructions?: string
  items: PhoneOrderItemInput[]
  /** Manual delivery charge override; 0 for pickup. */
  deliveryCharge?: number
  /** Optional coupon applied on the phone-order screen. */
  couponCode?: string
  /**
   * Phone/counter collection point. Online checkout on the admin PC is not used;
   * customers pay via shared UPI link, at counter, or on delivery.
   */
  paymentCollection?: 'counter' | 'delivery' | 'link'
}

export interface CreatePhoneOrderResult extends Order {
  payment_share_token: string
}

export async function createPhoneOrder(
  input: CreatePhoneOrderInput,
): Promise<ServiceResponse<CreatePhoneOrderResult>> {
  const customerName = input.customerName.trim()
  const customerPhone = input.customerPhone.trim()

  if (!customerName) {
    return createErrorResponse('Customer name is required.')
  }

  if (!/^\d{10}$/.test(customerPhone)) {
    return createErrorResponse('Enter a valid 10-digit phone number.')
  }

  if (!input.items.length) {
    return createErrorResponse('Add at least one dish to the order.')
  }

  for (const item of input.items) {
    if (item.quantity < 1 || item.unitPrice <= 0) {
      return createErrorResponse('Each item needs a valid quantity and price.')
    }
  }

  if (input.fulfillmentType === 'delivery') {
    const hasAddress = Boolean(input.addressId)
    const guest = input.guestAddress
    const hasGuestAddress = Boolean(
      guest?.line1?.trim() &&
        guest?.city?.trim() &&
        guest?.state?.trim() &&
        /^\d{6}$/.test(guest?.pincode?.trim() ?? ''),
    )

    if (!hasAddress && !hasGuestAddress) {
      return createErrorResponse(
        'Delivery orders need a saved address or a delivery address.',
      )
    }
  }

  const subtotal = input.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  )

  let discount = 0
  if (input.couponCode?.trim()) {
    const couponResult = await offerService.validateCoupon(
      input.couponCode,
      subtotal,
    )
    if (!couponResult.success) {
      return createErrorResponse(couponResult.message, couponResult.error)
    }
    discount = couponResult.data.discountAmount
  }

  const deliveryCharge =
    input.fulfillmentType === 'pickup'
      ? 0
      : (input.deliveryCharge ?? defaultDeliveryCharge(subtotal))
  // Phone/counter bills always include GST so the shared payment link shows tax.
  const taxRate = ORDER_TAX_RATE
  const totals = calculateOrderTotals(
    subtotal,
    discount,
    deliveryCharge,
    taxRate,
  )

  let branchId = input.branchId ?? null
  if (!branchId) {
    const defaultBranch = await branchService.getDefaultBranch()
    if (defaultBranch.success) {
      branchId = defaultBranch.data.id
    }
  }

  const openResult = await assertStoreAcceptingOrders()
  if (!openResult.success) {
    return openResult
  }

  const etaResult = await settingsService.getDefaultEtaMinutes()
  const etaMinutes = etaResult.success ? etaResult.data : DEFAULT_ETA_MINUTES
  const estimatedDelivery = addMinutesToIso(new Date(), etaMinutes)
  const sequenceResult = await settingsService.getOrderNumberSequence(branchId)
  const orderNumber = generateOrderNumber(
    sequenceResult.success ? sequenceResult.data : undefined,
  )
  const guest = input.guestAddress
  const paymentShareToken = crypto.randomUUID()
  const paymentMethod: PaymentMethod = 'pay_later'

  const orderPayload: Record<string, unknown> = {
    organization_id: DEFAULT_ORGANIZATION_ID,
    order_number: orderNumber,
    user_id: input.userId?.trim() || null,
    address_id:
      input.fulfillmentType === 'delivery' ? (input.addressId ?? null) : null,
    subtotal: totals.subtotal,
    tax: totals.tax,
    delivery_charge: totals.deliveryCharge,
    discount: totals.discount,
    total: totals.total,
    payment_method: paymentMethod,
    payment_status: 'pending',
    // Staff already took the call — land on the kitchen board (Confirmed), not New Orders.
    order_status: 'confirmed',
    fulfillment_type: input.fulfillmentType,
    order_source: 'phone',
    payment_share_token: paymentShareToken,
    guest_name: customerName,
    guest_phone: customerPhone,
    guest_address_line1:
      input.fulfillmentType === 'delivery' && !input.addressId
        ? guest?.line1.trim() || null
        : null,
    guest_address_line2:
      input.fulfillmentType === 'delivery' && !input.addressId
        ? guest?.line2?.trim() || null
        : null,
    guest_landmark:
      input.fulfillmentType === 'delivery' && !input.addressId
        ? guest?.landmark?.trim() || null
        : null,
    guest_city:
      input.fulfillmentType === 'delivery' && !input.addressId
        ? guest?.city.trim() || null
        : null,
    guest_state:
      input.fulfillmentType === 'delivery' && !input.addressId
        ? guest?.state.trim() || null
        : null,
    guest_pincode:
      input.fulfillmentType === 'delivery' && !input.addressId
        ? guest?.pincode.trim() || null
        : null,
    special_instructions: input.specialInstructions?.trim() || null,
    estimated_delivery: estimatedDelivery,
    delivery_provider: 'own',
    whatsapp_updates_opt_in: false,
  }

  if (branchId) {
    orderPayload.branch_id = branchId
  }

  let { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select()
    .single()

  let compatPayload = orderPayload
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!orderError || !isMissingColumnError(orderError.message)) break

    compatPayload = stripMissingOrderColumns(compatPayload, orderError.message)
    const retry = await supabase
      .from('orders')
      .insert(compatPayload)
      .select()
      .single()

    order = retry.data
    orderError = retry.error
  }

  if (orderError || !order) {
    return createErrorResponse(
      'Unable to create phone order.',
      orderError?.message,
    )
  }

  const orderItems = input.items.map((item) => ({
    order_id: order.id,
    dish_id: item.dishId,
    quantity: item.quantity,
    price: item.unitPrice,
    total: item.unitPrice * item.quantity,
    dish_name_snapshot: item.dishName,
    modifiers_snapshot: [],
  }))

  let { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)

  if (itemsError && isMissingOrderItemColumnError(itemsError.message)) {
    const legacyItems = input.items.map((item) => ({
      order_id: order.id,
      dish_id: item.dishId,
      quantity: item.quantity,
      price: item.unitPrice,
      total: item.unitPrice * item.quantity,
    }))
    const retry = await supabase.from('order_items').insert(legacyItems)
    itemsError = retry.error
  }

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id)
    return createErrorResponse(
      'Unable to create order items.',
      itemsError.message,
    )
  }

  const { error: paymentError } = await supabase.from('payments').insert({
    order_id: order.id,
    organization_id:
      (order.organization_id as string | undefined) ?? DEFAULT_ORGANIZATION_ID,
    payment_gateway: 'pay_later',
    provider: 'pay_later',
    payment_mode: 'DIRECT',
    amount: totals.total,
    status: 'pending',
  })

  if (paymentError) {
    await supabase.from('orders').delete().eq('id', order.id)
    return createErrorResponse(
      'Unable to create payment record.',
      paymentError.message,
    )
  }

  if (input.userId) {
    void notificationService.notifyOrderStatus(
      input.userId,
      order.id as string,
      orderNumber,
      'confirmed',
    )
  }

  const mapped = mapOrder(order)
  const token =
    (order.payment_share_token as string | undefined)?.trim() ||
    paymentShareToken

  return createSuccessResponse({
    ...mapped,
    payment_share_token: token,
  })
}

const ADMIN_ORDERS_SELECT = `
  *,
  profiles(full_name, email, phone),
  order_items(
    quantity,
    price,
    dish_name_snapshot,
    modifiers_snapshot,
    dishes(name)
  ),
  delivery(delivery_partner, partner_phone)
`

const ADMIN_ORDERS_SELECT_LEGACY = `
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
  const buildQuery = (select: string) => {
    let query = supabase
      .from('orders')
      .select(select)
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('order_status', filters.status)
    }

    if (filters?.createdFrom) {
      query = query.gte('created_at', filters.createdFrom)
    }

    if (filters?.createdTo) {
      query = query.lte('created_at', filters.createdTo)
    }

    if (filters?.search?.trim()) {
      query = query.ilike('order_number', `%${filters.search.trim()}%`)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    return query
  }

  let { data, error } = await buildQuery(ADMIN_ORDERS_SELECT)

  if (error && isMissingOrderItemColumnError(error.message)) {
    const retry = await buildQuery(ADMIN_ORDERS_SELECT_LEGACY)
    data = retry.data
    error = retry.error
  }

  if (error) {
    return createErrorResponse('Unable to load orders.', error.message)
  }

  return createSuccessResponse(
    ((data ?? []) as unknown as Record<string, unknown>[]).map(mapAdminOrder),
  )
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

async function requireStaffOrderManager(): Promise<ServiceResponse<true>> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userResult.data)
    .maybeSingle()

  if (error) {
    return createErrorResponse(
      'Unable to verify permissions.',
      error.message,
    )
  }

  if (
    !profile ||
    (profile.role !== 'admin' && profile.role !== 'platform_master')
  ) {
    return createErrorResponse(
      'Only restaurant staff can change or cancel order status.',
    )
  }

  return createSuccessResponse(true)
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<ServiceResponse<Order>> {
  const staffResult = await requireStaffOrderManager()

  if (!staffResult.success) {
    return staffResult
  }

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('id, order_status, estimated_delivery, fulfillment_type, user_id')
    .eq('id', orderId)
    .maybeSingle()

  if (fetchError) {
    return createErrorResponse('Unable to load order.', fetchError.message)
  }

  if (!existing) {
    return createErrorResponse('Order not found.')
  }

  const currentStatus = existing.order_status as OrderStatus
  const fulfillmentType =
    (existing.fulfillment_type as FulfillmentType | null) ?? 'delivery'
  const transitionError = getOrderStatusTransitionError(
    currentStatus,
    status,
    fulfillmentType,
  )

  if (transitionError) {
    return createErrorResponse(transitionError)
  }

  if (status === 'out_for_delivery') {
    if (fulfillmentType === 'pickup') {
      return createErrorResponse(
        'Pickup orders cannot be marked out for delivery. Mark as picked up instead.',
      )
    }

    const { data: delivery, error: deliveryError } = await supabase
      .from('delivery')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle()

    if (deliveryError) {
      return createErrorResponse(
        'Unable to verify delivery assignment.',
        deliveryError.message,
      )
    }

    if (!delivery) {
      return createErrorResponse(
        'Assign a delivery partner before marking the order out for delivery.',
      )
    }
  }

  if (currentStatus === status) {
    const { data: unchanged, error: unchangedError } = await supabase
      .from('orders')
      .select()
      .eq('id', orderId)
      .single()

    if (unchangedError) {
      return createErrorResponse(
        'Unable to load order.',
        unchangedError.message,
      )
    }

    return createSuccessResponse(mapOrder(unchanged))
  }

  const updates: Record<string, unknown> = { order_status: status }

  // On accept, ensure an ETA exists (uses admin default if still missing).
  if (status === 'confirmed' && !existing.estimated_delivery) {
    const etaResult = await settingsService.getDefaultEtaMinutes()
    const etaMinutes = etaResult.success ? etaResult.data : DEFAULT_ETA_MINUTES
    updates.estimated_delivery = addMinutesToIso(new Date(), etaMinutes)
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to update order status.', error.message)
  }

  // Keep any existing delivery assignment in sync with kitchen/dispatch status.
  await supabase
    .from('delivery')
    .update({
      status,
      ...(status === 'delivered'
        ? { delivered_at: new Date().toISOString() }
        : {}),
    })
    .eq('order_id', orderId)

  if (data.user_id) {
    void notificationService.notifyOrderStatus(
      data.user_id as string,
      data.id as string,
      data.order_number as string,
      status,
    )
  }

  if (status === 'delivered' && data.user_id) {
    void loyaltyService.earnPointsForOrder(
      data.user_id as string,
      data.id as string,
      Number(data.total),
    )
  }

  if (status === 'cancelled') {
    requestPidgeCancel(orderId)
  }

  return createSuccessResponse(mapOrder(data))
}

export async function updateEstimatedDelivery(
  orderId: string,
  estimatedDeliveryIso: string,
): Promise<ServiceResponse<Order>> {
  const target = new Date(estimatedDeliveryIso)
  if (Number.isNaN(target.getTime())) {
    return createErrorResponse('Please provide a valid delivery time.')
  }

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('id, order_status')
    .eq('id', orderId)
    .maybeSingle()

  if (fetchError) {
    return createErrorResponse('Unable to load order.', fetchError.message)
  }

  if (!existing) {
    return createErrorResponse('Order not found.')
  }

  if (
    existing.order_status === 'delivered' ||
    existing.order_status === 'cancelled'
  ) {
    return createErrorResponse(
      'Cannot change delivery time for a completed or cancelled order.',
    )
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ estimated_delivery: target.toISOString() })
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    return createErrorResponse(
      'Unable to update delivery time.',
      error.message,
    )
  }

  return createSuccessResponse(mapOrder(data))
}

/** Extend (or set) ETA by adding minutes from now or from the current ETA. */
export async function bumpEstimatedDelivery(
  orderId: string,
  addMinutes: number,
  options?: { fromNow?: boolean },
): Promise<ServiceResponse<Order>> {
  const minutes = Math.round(addMinutes)
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
    return createErrorResponse('Add between 1 and 240 minutes.')
  }

  const { data: existing, error: fetchError } = await supabase
    .from('orders')
    .select('id, order_status, estimated_delivery')
    .eq('id', orderId)
    .maybeSingle()

  if (fetchError) {
    return createErrorResponse('Unable to load order.', fetchError.message)
  }

  if (!existing) {
    return createErrorResponse('Order not found.')
  }

  if (
    existing.order_status === 'delivered' ||
    existing.order_status === 'cancelled'
  ) {
    return createErrorResponse(
      'Cannot change delivery time for a completed or cancelled order.',
    )
  }

  const base =
    options?.fromNow || !existing.estimated_delivery
      ? new Date()
      : new Date(existing.estimated_delivery as string)

  const nextIso =
    !options?.fromNow &&
    existing.estimated_delivery &&
    new Date(existing.estimated_delivery as string).getTime() < Date.now()
      ? addMinutesToIso(new Date(), minutes)
      : addMinutesToIso(base, minutes)

  return updateEstimatedDelivery(orderId, nextIso)
}

/** Set ETA to exactly N minutes from now. */
export async function setEstimatedDeliveryMinutesFromNow(
  orderId: string,
  minutesFromNow: number,
): Promise<ServiceResponse<Order>> {
  const minutes = Math.round(minutesFromNow)
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 240) {
    return createErrorResponse(
      'Delivery time must be between 5 and 240 minutes from now.',
    )
  }

  return updateEstimatedDelivery(orderId, addMinutesToIso(new Date(), minutes))
}

/** Admin-only cancel. Customers may view status but cannot cancel. */
export async function cancelOrder(
  orderId: string,
): Promise<ServiceResponse<Order>> {
  const staffResult = await requireStaffOrderManager()

  if (!staffResult.success) {
    return staffResult
  }

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('order_status')
    .eq('id', orderId)
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
