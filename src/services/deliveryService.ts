import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Delivery } from '@/types/Delivery'
import type { OrderStatus } from '@/types/enums'
import type { AdminOrder } from '@/services/orderService'
import { supabase } from '@/services/supabaseClient'
import { mapOrder } from '@/utils/mapOrder'

export interface DeliveryWithOrder extends Delivery {
  order_number: string
  customer_name: string
  customer_phone: string | null
  order_total: number
}

function mapDelivery(row: Record<string, unknown>): Delivery {
  return {
    id: row.id as string,
    order_id: row.order_id as string,
    delivery_partner: (row.delivery_partner as string | null) ?? null,
    partner_phone: (row.partner_phone as string | null) ?? null,
    status: row.status as OrderStatus,
    assigned_at: (row.assigned_at as string | null) ?? null,
    delivered_at: (row.delivered_at as string | null) ?? null,
  }
}

function mapDeliveryWithOrder(row: Record<string, unknown>): DeliveryWithOrder {
  const order = row.orders as Record<string, unknown> | null
  const profile = order?.profiles as { full_name: string; phone: string | null } | null

  return {
    ...mapDelivery(row),
    order_number: (order?.order_number as string) ?? '',
    customer_name: profile?.full_name ?? 'Unknown',
    customer_phone: profile?.phone ?? null,
    order_total: Number(order?.total ?? 0),
  }
}

function mapAdminOrder(row: Record<string, unknown>): AdminOrder {
  const profile = row.profiles as { full_name: string; email: string } | null

  return {
    ...mapOrder(row),
    customer_name: profile?.full_name ?? 'Unknown',
    customer_email: profile?.email ?? '',
  }
}

export async function getDeliveries(): Promise<
  ServiceResponse<DeliveryWithOrder[]>
> {
  const { data, error } = await supabase
    .from('delivery')
    .select(
      '*, orders(order_number, total, profiles(full_name, phone))',
    )
    .order('assigned_at', { ascending: false, nullsFirst: false })

  if (error) {
    return createErrorResponse('Unable to load deliveries.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapDeliveryWithOrder))
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
    .in('order_status', ['confirmed', 'preparing', 'ready'])
    .order('created_at', { ascending: true })

  if (error) {
    return createErrorResponse('Unable to load orders.', error.message)
  }

  const unassigned = (data ?? []).filter(
    (row) => !assignedOrderIds.has(row.id as string),
  )

  return createSuccessResponse(unassigned.map(mapAdminOrder))
}

export interface AssignDeliveryInput {
  orderId: string
  deliveryPartner: string
  partnerPhone: string
}

export async function assignDelivery(
  input: AssignDeliveryInput,
): Promise<ServiceResponse<Delivery>> {
  const partner = input.deliveryPartner.trim()
  const phone = input.partnerPhone.trim()

  if (!partner) {
    return createErrorResponse('Delivery partner name is required.')
  }

  if (!/^\d{10}$/.test(phone)) {
    return createErrorResponse('Partner phone must be 10 digits.')
  }

  const { data: existing } = await supabase
    .from('delivery')
    .select('id')
    .eq('order_id', input.orderId)
    .maybeSingle()

  if (existing) {
    return createErrorResponse('This order already has a delivery assignment.')
  }

  const assignedAt = new Date().toISOString()

  const { data, error } = await supabase
    .from('delivery')
    .insert({
      order_id: input.orderId,
      delivery_partner: partner,
      partner_phone: phone,
      status: 'out_for_delivery',
      assigned_at: assignedAt,
    })
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to assign delivery.', error.message)
  }

  await supabase
    .from('orders')
    .update({ order_status: 'out_for_delivery' })
    .eq('id', input.orderId)

  return createSuccessResponse(mapDelivery(data))
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: OrderStatus,
): Promise<ServiceResponse<Delivery>> {
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

  await supabase
    .from('orders')
    .update({ order_status: status })
    .eq('id', data.order_id)

  return createSuccessResponse(mapDelivery(data))
}
