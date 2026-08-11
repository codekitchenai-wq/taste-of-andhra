import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Delivery } from '@/types/Delivery'
import type { OrderStatus } from '@/types/enums'
import type { AdminOrder } from '@/services/orderService'
import * as loyaltyService from '@/services/loyaltyService'
import * as notificationService from '@/services/notificationService'
import { supabase } from '@/services/supabaseClient'
import { mapOrder } from '@/utils/mapOrder'
import { toE164IndianPhone, normalizeIndianPhone } from '@/utils/phone'
import { getOrderStatusTransitionError } from '@/utils/orderStatusTransitions'

export interface DeliveryWithOrder extends Delivery {
  order_number: string
  customer_name: string
  customer_phone: string | null
  order_total: number
  delivery_address?: string | null
  dropoff_lat?: number | null
  dropoff_lng?: number | null
}

function mapDelivery(row: Record<string, unknown>): Delivery {
  return {
    id: row.id as string,
    order_id: row.order_id as string,
    delivery_partner: (row.delivery_partner as string | null) ?? null,
    partner_phone: (row.partner_phone as string | null) ?? null,
    partner_user_id: (row.partner_user_id as string | null) ?? null,
    status: row.status as OrderStatus,
    assigned_at: (row.assigned_at as string | null) ?? null,
    delivered_at: (row.delivered_at as string | null) ?? null,
    current_lat: row.current_lat != null ? Number(row.current_lat) : null,
    current_lng: row.current_lng != null ? Number(row.current_lng) : null,
    location_updated_at:
      (row.location_updated_at as string | null) ?? null,
  }
}

function mapDeliveryWithOrder(row: Record<string, unknown>): DeliveryWithOrder {
  const order = row.orders as Record<string, unknown> | null
  const profile = order?.profiles as {
    full_name: string
    phone: string | null
  } | null
  const address = order?.addresses as Record<string, unknown> | null

  const addressParts = address
    ? [
        address.address_line1,
        address.address_line2,
        address.city,
        address.pincode,
      ]
        .filter(Boolean)
        .join(', ')
    : null

  return {
    ...mapDelivery(row),
    order_number: (order?.order_number as string) ?? '',
    customer_name: profile?.full_name ?? 'Unknown',
    customer_phone: profile?.phone ?? null,
    order_total: Number(order?.total ?? 0),
    delivery_address: addressParts,
    dropoff_lat: address?.latitude != null ? Number(address.latitude) : null,
    dropoff_lng: address?.longitude != null ? Number(address.longitude) : null,
  }
}

function mapAdminOrder(row: Record<string, unknown>): AdminOrder {
  const profile = row.profiles as {
    full_name: string
    email: string
    phone?: string | null
  } | null

  return {
    ...mapOrder(row),
    customer_name: profile?.full_name ?? 'Unknown',
    customer_email: profile?.email ?? '',
    customer_phone: profile?.phone ?? null,
    items: [],
    delivery_partner: null,
    partner_phone: null,
  }
}

type PartnerFunctionAction = 'list' | 'get' | 'update_status'

async function invokeDeliveryPartnerFunction<T>(
  body: Record<string, unknown> & { action: PartnerFunctionAction },
): Promise<{ data: T | null; error: string | null; missing: boolean }> {
  const { data, error } = await supabase.functions.invoke<{
    data?: T
    error?: string
  }>('delivery-partner', { body })

  if (error) {
    const message = error.message || 'Delivery partner service unavailable.'
    const missing =
      message.toLowerCase().includes('not found') ||
      message.toLowerCase().includes('failed to send') ||
      message.includes('404')
    return { data: null, error: message, missing }
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return { data: null, error: String(data.error), missing: false }
  }

  return { data: (data?.data as T) ?? null, error: null, missing: false }
}

export async function getDeliveries(): Promise<
  ServiceResponse<DeliveryWithOrder[]>
> {
  const { data, error } = await supabase
    .from('delivery')
    .select(
      '*, orders(order_number, total, profiles(full_name, phone), addresses(address_line1, address_line2, city, pincode, latitude, longitude))',
    )
    .order('assigned_at', { ascending: false, nullsFirst: false })

  if (error) {
    return createErrorResponse('Unable to load deliveries.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapDeliveryWithOrder))
}

export async function getMyPartnerDeliveries(): Promise<
  ServiceResponse<DeliveryWithOrder[]>
> {
  const viaFunction = await invokeDeliveryPartnerFunction<DeliveryWithOrder[]>({
    action: 'list',
  })

  if (!viaFunction.missing && !viaFunction.error && viaFunction.data) {
    return createSuccessResponse(viaFunction.data)
  }

  if (!viaFunction.missing && viaFunction.error) {
    return createErrorResponse(
      'Unable to load your deliveries.',
      viaFunction.error,
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return createErrorResponse('Please sign in as a delivery partner.')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', user.id)
    .maybeSingle()

  const { data, error } = await supabase
    .from('delivery')
    .select(
      '*, orders(order_number, total, profiles(full_name, phone), addresses(address_line1, address_line2, city, pincode, latitude, longitude))',
    )
    .order('assigned_at', { ascending: false, nullsFirst: false })

  if (error) {
    return createErrorResponse('Unable to load your deliveries.', error.message)
  }

  const phone = profile?.phone as string | null
  const localPhone = phone ? normalizeIndianPhone(phone) : null

  const mine = (data ?? []).filter((row) => {
    const mapped = mapDelivery(row)
    if (mapped.partner_user_id === user.id) return true
    if (!mapped.partner_phone || !localPhone) return false
    return normalizeIndianPhone(mapped.partner_phone) === localPhone
  })

  return createSuccessResponse(mine.map(mapDeliveryWithOrder))
}

export async function getDeliveryById(
  deliveryId: string,
): Promise<ServiceResponse<DeliveryWithOrder>> {
  const viaFunction = await invokeDeliveryPartnerFunction<DeliveryWithOrder>({
    action: 'get',
    deliveryId,
  })

  if (!viaFunction.missing && !viaFunction.error && viaFunction.data) {
    return createSuccessResponse(viaFunction.data)
  }

  if (!viaFunction.missing && viaFunction.error) {
    return createErrorResponse('Unable to load delivery.', viaFunction.error)
  }

  const { data, error } = await supabase
    .from('delivery')
    .select(
      '*, orders(order_number, total, user_id, profiles(full_name, phone), addresses(address_line1, address_line2, city, pincode, latitude, longitude))',
    )
    .eq('id', deliveryId)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load delivery.', error.message)
  }

  if (!data) {
    return createErrorResponse('Delivery not found.')
  }

  return createSuccessResponse(mapDeliveryWithOrder(data))
}

export async function getDeliveryByOrderId(
  orderId: string,
): Promise<ServiceResponse<Delivery | null>> {
  const { data, error } = await supabase
    .from('delivery')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load delivery tracking.', error.message)
  }

  return createSuccessResponse(data ? mapDelivery(data) : null)
}

export async function getOrdersAwaitingDelivery(): Promise<
  ServiceResponse<AdminOrder[]>
> {
  const { data: deliveryRows, error: deliveryError } = await supabase
    .from('delivery')
    .select('order_id')

  if (deliveryError) {
    return createErrorResponse(
      'Unable to load delivery queue.',
      deliveryError.message,
    )
  }

  const assignedOrderIds = new Set(
    (deliveryRows ?? []).map((row) => row.order_id as string),
  )

  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles(full_name, email)')
    .eq('order_status', 'ready')
    .order('created_at', { ascending: true })

  if (error) {
    return createErrorResponse('Unable to load orders.', error.message)
  }

  const unassigned = (data ?? []).filter(
    (row) => !assignedOrderIds.has(row.id as string),
  )

  return createSuccessResponse(unassigned.map(mapAdminOrder))
}

export async function getDeliveryPartners(): Promise<
  ServiceResponse<{ id: string; full_name: string; phone: string | null }[]>
> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'delivery')
    .eq('is_active', true)
    .order('full_name')

  if (error) {
    return createErrorResponse(
      'Unable to load delivery partners.',
      error.message,
    )
  }

  return createSuccessResponse(
    (data ?? []).map((row) => ({
      id: row.id as string,
      full_name: row.full_name as string,
      phone: (row.phone as string | null) ?? null,
    })),
  )
}

export interface AssignDeliveryInput {
  orderId: string
  deliveryPartner: string
  partnerPhone: string
  partnerUserId?: string
}

export async function assignDelivery(
  input: AssignDeliveryInput,
): Promise<ServiceResponse<Delivery>> {
  const partner = input.deliveryPartner.trim()
  const localPhone = normalizeIndianPhone(input.partnerPhone)

  if (!partner) {
    return createErrorResponse('Delivery partner name is required.')
  }

  if (!localPhone) {
    return createErrorResponse('Partner phone must be a valid 10-digit number.')
  }

  const e164 = toE164IndianPhone(localPhone)

  let partnerUserId = input.partnerUserId ?? null

  if (!partnerUserId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'delivery')
      .or(`phone.eq."${e164}",phone.eq.${localPhone}`)
      .limit(1)
      .maybeSingle()

    if (profile) {
      partnerUserId = profile.id as string
    }
  }

  const { data: existing } = await supabase
    .from('delivery')
    .select('id')
    .eq('order_id', input.orderId)
    .maybeSingle()

  if (existing) {
    return createErrorResponse('This order already has a delivery assignment.')
  }

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .select('id, user_id, order_number, order_status')
    .eq('id', input.orderId)
    .maybeSingle()

  if (orderError) {
    return createErrorResponse('Unable to load order.', orderError.message)
  }

  if (!orderRow) {
    return createErrorResponse('Order not found.')
  }

  const orderStatus = orderRow.order_status as OrderStatus

  if (orderStatus !== 'ready') {
    return createErrorResponse(
      'Delivery partners can only be assigned when the order is ready.',
    )
  }

  // Kitchen has marked ready — assign and dispatch as out for delivery.
  const deliveryStatus: OrderStatus = 'out_for_delivery'

  const assignedAt = new Date().toISOString()

  // Omit partner_user_id when unset so assign still works if the DB
  // migration that adds that column has not been applied yet.
  const insertRow: Record<string, unknown> = {
    order_id: input.orderId,
    delivery_partner: partner,
    partner_phone: localPhone,
    status: deliveryStatus,
    assigned_at: assignedAt,
  }
  if (partnerUserId) {
    insertRow.partner_user_id = partnerUserId
  }

  let { data, error } = await supabase
    .from('delivery')
    .insert(insertRow)
    .select()
    .single()

  // Older projects may not have partner_user_id yet — retry without it.
  if (
    error &&
    partnerUserId &&
    error.message.toLowerCase().includes('partner_user_id') &&
    error.message.toLowerCase().includes('does not exist')
  ) {
    delete insertRow.partner_user_id
    const retry = await supabase
      .from('delivery')
      .insert(insertRow)
      .select()
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) {
    if (error.code === '23505' || error.message.toLowerCase().includes('duplicate key')) {
      return createErrorResponse(
        'This order already has a delivery assignment.',
        error.message,
      )
    }
    return createErrorResponse('Unable to assign delivery.', error.message)
  }

  const { data: order, error: updateError } = await supabase
    .from('orders')
    .update({ order_status: 'out_for_delivery' })
    .eq('id', input.orderId)
    .select('id, user_id, order_number')
    .single()

  if (updateError) {
    return createErrorResponse(
      'Partner assigned, but unable to mark out for delivery.',
      updateError.message,
    )
  }

  if (order) {
    void notificationService.notifyOrderStatus(
      order.user_id as string,
      order.id as string,
      order.order_number as string,
      'out_for_delivery',
    )
  }

  return createSuccessResponse(mapDelivery(data))
}

async function notifyStatusAndLoyalty(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, order_number, total')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return

  void notificationService.notifyOrderStatus(
    order.user_id as string,
    order.id as string,
    order.order_number as string,
    status,
  )

  if (status === 'delivered') {
    void loyaltyService.earnPointsForOrder(
      order.user_id as string,
      order.id as string,
      Number(order.total),
    )
  }
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: OrderStatus,
): Promise<ServiceResponse<Delivery>> {
  const { data: existing, error: fetchError } = await supabase
    .from('delivery')
    .select('*, orders(order_status)')
    .eq('id', deliveryId)
    .maybeSingle()

  if (fetchError) {
    return createErrorResponse('Unable to load delivery.', fetchError.message)
  }

  if (!existing) {
    return createErrorResponse('Delivery not found.')
  }

  const orderMeta = existing.orders as { order_status: OrderStatus } | null
  const currentOrderStatus =
    (orderMeta?.order_status as OrderStatus | undefined) ??
    (existing.status as OrderStatus)

  const transitionError = getOrderStatusTransitionError(
    currentOrderStatus,
    status,
  )

  // Allow repairing a delivery already marked delivered when the order sync
  // previously failed under older RLS rules.
  const repairingDeliveredSync =
    status === 'delivered' &&
    existing.status === 'delivered' &&
    currentOrderStatus === 'out_for_delivery'

  if (transitionError && !repairingDeliveredSync) {
    return createErrorResponse(transitionError)
  }

  if (status === 'out_for_delivery' && currentOrderStatus !== 'ready') {
    return createErrorResponse(
      'Order must be ready before it can go out for delivery.',
    )
  }

  // Prefer the atomic RPC so delivery + order never diverge.
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'update_delivery_and_order_status',
    {
      p_delivery_id: deliveryId,
      p_status: status,
    },
  )

  if (!rpcError && rpcData) {
    const mapped = mapDelivery(rpcData as Record<string, unknown>)
    if (currentOrderStatus !== status || repairingDeliveredSync) {
      void notifyStatusAndLoyalty(mapped.order_id, status)
    }
    return createSuccessResponse(mapped)
  }

  const rpcMissing =
    rpcError &&
    (rpcError.message.toLowerCase().includes('could not find the function') ||
      rpcError.message.toLowerCase().includes('does not exist') ||
      rpcError.code === 'PGRST202')

  // Edge function path — works before the RPC migration is applied.
  if (status === 'delivered' && (rpcMissing || rpcError)) {
    const viaFunction = await invokeDeliveryPartnerFunction<Delivery>({
      action: 'update_status',
      deliveryId,
      status,
    })

    if (!viaFunction.missing && !viaFunction.error && viaFunction.data) {
      return createSuccessResponse(viaFunction.data)
    }

    if (!viaFunction.missing && viaFunction.error) {
      return createErrorResponse(
        'Unable to update delivery status.',
        viaFunction.error,
      )
    }
  }

  if (rpcError && !rpcMissing) {
    return createErrorResponse(
      'Unable to update delivery status.',
      rpcError.message,
    )
  }

  // Fallback for environments that have not applied the RPC migration yet.
  const updates: Record<string, unknown> = { status }

  if (status === 'delivered') {
    updates.delivered_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('delivery')
    .update(updates)
    .eq('id', deliveryId)
    .select()
    .single()

  if (error) {
    return createErrorResponse(
      'Unable to update delivery status.',
      error.message,
    )
  }

  if (currentOrderStatus !== status || repairingDeliveredSync) {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({ order_status: status })
      .eq('id', data.order_id)
      .select('id, user_id, order_number, total')
      .single()

    if (orderError) {
      return createErrorResponse(
        'Unable to update order status.',
        orderError.message,
      )
    }

    if (order) {
      void notificationService.notifyOrderStatus(
        order.user_id as string,
        order.id as string,
        order.order_number as string,
        status,
      )

      if (status === 'delivered') {
        void loyaltyService.earnPointsForOrder(
          order.user_id as string,
          order.id as string,
          Number(order.total),
        )
      }
    }
  }

  return createSuccessResponse(mapDelivery(data))
}

export async function updateDeliveryLocation(
  deliveryId: string,
  latitude: number,
  longitude: number,
): Promise<ServiceResponse<Delivery>> {
  const { data, error } = await supabase
    .from('delivery')
    .update({
      current_lat: latitude,
      current_lng: longitude,
      location_updated_at: new Date().toISOString(),
    })
    .eq('id', deliveryId)
    .select()
    .single()

  if (error) {
    return createErrorResponse(
      'Unable to update location.',
      error.message,
    )
  }

  return createSuccessResponse(mapDelivery(data))
}

export function subscribeToAllDeliveries(
  onUpdate: (delivery: Delivery) => void,
): () => void {
  const channel = supabase
    .channel('delivery-admin-feed')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'delivery' },
      (payload) => {
        onUpdate(mapDelivery(payload.new as Record<string, unknown>))
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

export function subscribeToDeliveryLocation(
  orderId: string,
  onUpdate: (delivery: Delivery) => void,
): () => void {
  const channel = supabase
    .channel(`delivery-location-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'delivery',
        filter: `order_id=eq.${orderId}`,
      },
      (payload) => {
        onUpdate(mapDelivery(payload.new as Record<string, unknown>))
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
