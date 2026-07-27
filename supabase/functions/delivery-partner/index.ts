// Delivery partner APIs that bypass nested RLS gaps for customer/address reads
// and mark deliveries complete atomically with the service role.
//
// Deploy: supabase functions deploy delivery-partner

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'

type Action = 'list' | 'get' | 'update_status'

interface RequestBody {
  action?: Action
  deliveryId?: string
  status?: string
}

function normalizePhone(input: string | null | undefined): string {
  return (input ?? '').replace(/\D/g, '').slice(-10)
}

function formatAddress(address: Record<string, unknown> | null): string | null {
  if (!address) return null
  const parts = [
    address.address_line1,
    address.address_line2,
    address.city,
    address.pincode,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

function mapDeliveryWithOrder(
  row: Record<string, unknown>,
  order: Record<string, unknown> | null,
  profile: Record<string, unknown> | null,
  address: Record<string, unknown> | null,
) {
  return {
    id: row.id,
    order_id: row.order_id,
    delivery_partner: row.delivery_partner ?? null,
    partner_phone: row.partner_phone ?? null,
    partner_user_id: row.partner_user_id ?? null,
    status: row.status,
    assigned_at: row.assigned_at ?? null,
    delivered_at: row.delivered_at ?? null,
    current_lat: row.current_lat != null ? Number(row.current_lat) : null,
    current_lng: row.current_lng != null ? Number(row.current_lng) : null,
    location_updated_at: row.location_updated_at ?? null,
    order_number: (order?.order_number as string) ?? '',
    customer_name: (profile?.full_name as string) ?? 'Unknown',
    customer_phone: (profile?.phone as string | null) ?? null,
    order_total: Number(order?.total ?? 0),
    delivery_address: formatAddress(address),
    dropoff_lat: address?.latitude != null ? Number(address.latitude) : null,
    dropoff_lng: address?.longitude != null ? Number(address.longitude) : null,
  }
}

function isAssignedToCaller(
  row: Record<string, unknown>,
  userId: string,
  callerPhone: string,
): boolean {
  if (row.partner_user_id === userId) return true
  const partnerPhone = normalizePhone(row.partner_phone as string | null)
  return partnerPhone !== '' && partnerPhone === callerPhone
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405)
  }

  const authHeader = request.headers.get('Authorization') ?? ''
  if (!authHeader) {
    return errorResponse('Missing authorization header.', 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return errorResponse('Server is missing Supabase credentials.', 500)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return errorResponse('Please sign in as a delivery partner.', 401)
  }

  const { data: callerProfile, error: profileError } = await admin
    .from('profiles')
    .select('id, role, phone, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !callerProfile) {
    return errorResponse('Unable to load delivery partner profile.', 500)
  }

  if (callerProfile.role !== 'delivery' || callerProfile.is_active === false) {
    return errorResponse('A delivery partner account is required.', 403)
  }

  const callerPhone = normalizePhone(callerProfile.phone as string | null)

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body.')
  }

  const action = body.action
  if (!action) {
    return errorResponse('action is required.')
  }

  if (action === 'list') {
    const { data, error } = await admin
      .from('delivery')
      .select(
        '*, orders(order_number, total, user_id, address_id, profiles(full_name, phone), addresses(address_line1, address_line2, city, pincode, latitude, longitude))',
      )
      .order('assigned_at', { ascending: false, nullsFirst: false })

    if (error) {
      return errorResponse('Unable to load your deliveries.', 500)
    }

    const mine = (data ?? [])
      .filter((row) =>
        isAssignedToCaller(row as Record<string, unknown>, user.id, callerPhone),
      )
      .map((row) => {
        const record = row as Record<string, unknown>
        const order = (record.orders as Record<string, unknown> | null) ?? null
        const profile =
          (order?.profiles as Record<string, unknown> | null) ?? null
        const address =
          (order?.addresses as Record<string, unknown> | null) ?? null
        return mapDeliveryWithOrder(record, order, profile, address)
      })

    return jsonResponse({ data: mine })
  }

  if (action === 'get') {
    if (!body.deliveryId) {
      return errorResponse('deliveryId is required.')
    }

    const { data, error } = await admin
      .from('delivery')
      .select(
        '*, orders(order_number, total, user_id, address_id, profiles(full_name, phone), addresses(address_line1, address_line2, city, pincode, latitude, longitude))',
      )
      .eq('id', body.deliveryId)
      .maybeSingle()

    if (error) {
      return errorResponse('Unable to load delivery.', 500)
    }

    if (!data) {
      return errorResponse('Delivery not found.', 404)
    }

    if (!isAssignedToCaller(data as Record<string, unknown>, user.id, callerPhone)) {
      return errorResponse('Not allowed to view this delivery.', 403)
    }

    const record = data as Record<string, unknown>
    const order = (record.orders as Record<string, unknown> | null) ?? null
    const profile = (order?.profiles as Record<string, unknown> | null) ?? null
    const address = (order?.addresses as Record<string, unknown> | null) ?? null

    return jsonResponse({
      data: mapDeliveryWithOrder(record, order, profile, address),
    })
  }

  if (action === 'update_status') {
    if (!body.deliveryId) {
      return errorResponse('deliveryId is required.')
    }

    if (body.status !== 'delivered') {
      return errorResponse('Delivery partners can only mark orders as delivered.')
    }

    const { data: existing, error: fetchError } = await admin
      .from('delivery')
      .select('*, orders(id, user_id, order_number, total, order_status)')
      .eq('id', body.deliveryId)
      .maybeSingle()

    if (fetchError) {
      return errorResponse('Unable to load delivery.', 500)
    }

    if (!existing) {
      return errorResponse('Delivery not found.', 404)
    }

    if (
      !isAssignedToCaller(existing as Record<string, unknown>, user.id, callerPhone)
    ) {
      return errorResponse('Not allowed to update this delivery.', 403)
    }

    const order = existing.orders as {
      id: string
      user_id: string
      order_number: string
      total: number
      order_status: string
    } | null

    if (!order) {
      return errorResponse('Order not found for this delivery.', 404)
    }

    const currentStatus = order.order_status
    const canDeliver =
      currentStatus === 'out_for_delivery' ||
      (existing.status === 'delivered' && currentStatus === 'out_for_delivery')

    if (!canDeliver && currentStatus !== 'delivered') {
      return errorResponse(
        'Order must be out for delivery before it can be marked delivered.',
      )
    }

    const deliveredAt =
      (existing.delivered_at as string | null) ?? new Date().toISOString()

    const { data: updatedDelivery, error: deliveryError } = await admin
      .from('delivery')
      .update({
        status: 'delivered',
        delivered_at: deliveredAt,
      })
      .eq('id', body.deliveryId)
      .select()
      .single()

    if (deliveryError || !updatedDelivery) {
      return errorResponse(
        deliveryError?.message ?? 'Unable to update delivery status.',
        500,
      )
    }

    if (order.order_status !== 'delivered') {
      const { error: orderError } = await admin
        .from('orders')
        .update({ order_status: 'delivered' })
        .eq('id', order.id)

      if (orderError) {
        return errorResponse(
          'Partner delivery updated, but unable to sync order status.',
          500,
        )
      }
    }

    // Best-effort side effects. Failures must not undo delivery completion.
    void admin.from('notifications').insert({
      user_id: order.user_id,
      title: 'Order delivered',
      body: `Your order ${order.order_number} has been delivered.`,
      channel: 'in_app',
      notification_type: 'order_status',
      order_id: order.id,
      metadata: { external_status: 'delivered' },
    })

    void admin.rpc('award_loyalty_for_order', {
      p_user_id: order.user_id,
      p_order_id: order.id,
      p_order_total: order.total,
    })

    return jsonResponse({
      data: mapDeliveryWithOrder(
        updatedDelivery as Record<string, unknown>,
        {
          order_number: order.order_number,
          total: order.total,
        },
        null,
        null,
      ),
    })
  }

  return errorResponse('Unknown action.')
})
