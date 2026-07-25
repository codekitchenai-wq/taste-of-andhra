// Receives Pidge rider status and location callbacks.
//
// Everything is written into the existing `delivery` row, so the customer
// tracking map, the admin board, and Realtime subscriptions keep working
// unchanged whether the rider is in-house or from Pidge.
//
// Register this URL in Pidge: Settings -> Channel Integration -> Webhook URL,
// with the same auth token as PIDGE_WEBHOOK_TOKEN.
//
// Deploy with JWT verification off, since Pidge signs with its own token:
//   supabase functions deploy pidge-webhook --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

// Pidge status vocabulary varies by account; unmapped values are stored on
// external_status but leave the internal order status untouched.
const STATUS_MAP: Record<string, OrderStatus> = {
  pending: 'out_for_delivery',
  created: 'out_for_delivery',
  allocated: 'out_for_delivery',
  accepted: 'out_for_delivery',
  rider_assigned: 'out_for_delivery',
  out_for_pickup: 'out_for_delivery',
  reached_pickup: 'out_for_delivery',
  picked_up: 'out_for_delivery',
  in_transit: 'out_for_delivery',
  out_for_delivery: 'out_for_delivery',
  reached_delivery: 'out_for_delivery',
  delivered: 'delivered',
  completed: 'delivered',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  failed: 'cancelled',
  returned: 'cancelled',
}

function readString(
  source: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim() !== '') return value
    if (typeof value === 'number') return String(value)
  }
  return null
}

function readNumber(
  source: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

/** Constant-time compare so the webhook token cannot be guessed by timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return mismatch === 0
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405)
  }

  const expectedToken = Deno.env.get('PIDGE_WEBHOOK_TOKEN') ?? ''

  if (!expectedToken) {
    return errorResponse('Webhook is not configured.', 500)
  }

  const presented = (
    request.headers.get('authorization') ??
    request.headers.get('x-auth-token') ??
    ''
  ).replace(/^Bearer\s+/i, '')

  if (!safeEqual(presented, expectedToken)) {
    return errorResponse('Unauthorized.', 401)
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return errorResponse('Invalid JSON body.')
  }

  const nested =
    payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : payload

  const jobId = readString(nested, [
    'id',
    'order_id',
    'pidge_id',
    'network_order_id',
  ])
  const referenceId = readString(nested, ['reference_id', 'order_number'])

  if (!jobId && !referenceId) {
    return errorResponse('Payload has no job or reference identifier.')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Server is missing Supabase credentials.', 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  let delivery: Record<string, unknown> | null = null

  if (jobId) {
    const { data } = await admin
      .from('delivery')
      .select('id, order_id, status')
      .eq('external_job_id', jobId)
      .maybeSingle()
    delivery = data
  }

  // Pidge echoes our order_number as reference_id, which is the recovery path
  // when a create-order response was lost before we stored the job id.
  if (!delivery && referenceId) {
    const { data: order } = await admin
      .from('orders')
      .select('id')
      .eq('order_number', referenceId)
      .maybeSingle()

    if (order) {
      const { data } = await admin
        .from('delivery')
        .select('id, order_id, status')
        .eq('order_id', order.id)
        .maybeSingle()
      delivery = data

      if (delivery && jobId) {
        await admin
          .from('delivery')
          .update({ external_job_id: jobId })
          .eq('id', delivery.id)
      }
    }
  }

  if (!delivery) {
    // 200 keeps Pidge from retrying forever on an order we do not own.
    return jsonResponse({ ignored: true, reason: 'No matching delivery.' })
  }

  const rawStatus = readString(nested, ['status', 'order_status', 'event'])
  const mappedStatus = rawStatus
    ? STATUS_MAP[rawStatus.toLowerCase().replace(/[\s-]+/g, '_')]
    : undefined

  const latitude = readNumber(nested, ['latitude', 'lat', 'rider_lat'])
  const longitude = readNumber(nested, ['longitude', 'lng', 'lon', 'rider_lng'])

  const riderName = readString(nested, ['rider_name', 'delivery_person_name'])
  const riderPhone = readString(nested, ['rider_phone', 'delivery_person_phone'])

  const updates: Record<string, unknown> = {}

  if (rawStatus) updates.external_status = rawStatus
  if (mappedStatus) updates.status = mappedStatus
  if (mappedStatus === 'delivered') {
    updates.delivered_at = new Date().toISOString()
  }
  if (riderName) updates.delivery_partner = riderName
  if (riderPhone) updates.partner_phone = riderPhone

  if (latitude !== null && longitude !== null) {
    updates.current_lat = latitude
    updates.current_lng = longitude
    updates.location_updated_at = new Date().toISOString()
  }

  const trackingUrl = readString(nested, ['tracking_url', 'track_url'])
  if (trackingUrl) updates.tracking_url = trackingUrl

  const actualAmount = readNumber(nested, ['amount', 'price', 'delivery_charge'])
  if (actualAmount !== null) updates.actual_amount = actualAmount

  if (Object.keys(updates).length === 0) {
    return jsonResponse({ ignored: true, reason: 'Nothing to update.' })
  }

  const { error: deliveryError } = await admin
    .from('delivery')
    .update(updates)
    .eq('id', delivery.id)

  if (deliveryError) {
    return jsonResponse({ error: deliveryError.message }, 500)
  }

  // Only terminal transitions move the order; intermediate rider events would
  // otherwise churn the kitchen board.
  if (mappedStatus === 'delivered' || mappedStatus === 'cancelled') {
    const { data: order } = await admin
      .from('orders')
      .select('id, order_status, user_id, total')
      .eq('id', delivery.order_id as string)
      .maybeSingle()

    if (order && order.order_status !== mappedStatus) {
      await admin
        .from('orders')
        .update({ order_status: mappedStatus })
        .eq('id', order.id)

      if (mappedStatus === 'delivered') {
        const { error: loyaltyError } = await admin.rpc(
          'award_loyalty_for_order',
          {
            p_user_id: order.user_id,
            p_order_id: order.id,
            p_order_total: Number(order.total),
          },
        )

        if (loyaltyError) {
          console.warn('[pidge-webhook] loyalty award failed:', loyaltyError.message)
        }
      }
    }
  }

  return jsonResponse({ ok: true, deliveryId: delivery.id })
})
