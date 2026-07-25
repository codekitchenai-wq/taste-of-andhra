// Books a Pidge rider for an order that the kitchen has marked ready.
//
// Booking is deliberately separate from quoting: a rider summoned at checkout
// would wait through the whole cook time, which is how food orders get
// cancelled. Admin-only.
//
// Deploy: supabase functions deploy pidge-dispatch

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { createJob, isPidgeConfigured } from '../_shared/pidge.ts'

const GRAMS_PER_ITEM = 400
const MIN_PACKAGE_GRAMS = 500

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

  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Server is missing Supabase credentials.', 500)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return errorResponse('Please sign in.', 401)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return errorResponse('Only admins can dispatch deliveries.', 403)
  }

  let body: { orderId?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body.')
  }

  if (!body.orderId) {
    return errorResponse('orderId is required.')
  }

  if (!isPidgeConfigured) {
    return errorResponse(
      'Pidge is not configured. Set PIDGE_API_TOKEN to dispatch through Pidge.',
      503,
    )
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select(
      '*, addresses(*), branches(*), order_items(quantity, price, dishes(name))',
    )
    .eq('id', body.orderId)
    .maybeSingle()

  if (orderError || !order) {
    return errorResponse('Order not found.', 404)
  }

  const { data: existing } = await admin
    .from('delivery')
    .select('id, external_job_id')
    .eq('order_id', order.id)
    .maybeSingle()

  if (existing?.external_job_id) {
    return errorResponse('This order already has a Pidge job.', 409)
  }

  const address = order.addresses as Record<string, unknown> | null
  const branch = order.branches as Record<string, unknown> | null

  if (!address) {
    return errorResponse('Order has no delivery address.', 422)
  }

  if (!branch || branch.latitude === null || branch.longitude === null) {
    return errorResponse(
      'Set latitude and longitude on the fulfilment branch before dispatching.',
      422,
    )
  }

  if (address.latitude === null || address.longitude === null) {
    return errorResponse(
      'This address has no map location, so a rider cannot be routed to it.',
      422,
    )
  }

  const items =
    (order.order_items as
      | { quantity: number; price: number; dishes: { name: string } | null }[]
      | null) ?? []

  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity), 0)

  const result = await createJob({
    referenceId: order.order_number as string,
    orderValue: Number(order.total),
    codAmount: order.payment_status === 'paid' ? 0 : Number(order.total),
    weightGrams: Math.max(MIN_PACKAGE_GRAMS, itemCount * GRAMS_PER_ITEM),
    items: items.map((item) => ({
      name: item.dishes?.name ?? 'Item',
      quantity: Number(item.quantity),
      price: Number(item.price),
    })),
    pickup: {
      name: branch.name as string,
      phone: (branch.phone as string | null) ?? '',
      latitude: Number(branch.latitude),
      longitude: Number(branch.longitude),
      addressLine: branch.address_line1 as string,
      city: branch.city as string,
      state: branch.state as string,
      pincode: branch.pincode as string,
    },
    drop: {
      name: address.full_name as string,
      phone: address.phone as string,
      latitude: Number(address.latitude),
      longitude: Number(address.longitude),
      addressLine: address.address_line1 as string,
      city: address.city as string,
      state: address.state as string,
      pincode: address.pincode as string,
      landmark: (address.landmark as string | null) ?? null,
      instructions: (order.special_instructions as string | null) ?? null,
    },
  })

  if (!result.ok) {
    // Record the failure so the admin board can offer own-fleet assignment.
    if (existing) {
      await admin
        .from('delivery')
        .update({ dispatch_error: result.error })
        .eq('id', existing.id)
    }

    return jsonResponse(
      { error: result.error ?? 'Pidge could not accept this order.' },
      502,
    )
  }

  const deliveryRow = {
    order_id: order.id,
    provider: 'pidge',
    delivery_partner: 'Pidge',
    partner_phone: null,
    status: 'out_for_delivery',
    assigned_at: new Date().toISOString(),
    external_job_id: result.job.jobId,
    external_status: result.job.status,
    tracking_url: result.job.trackingUrl,
    quoted_amount: Number(order.delivery_charge),
    actual_amount: result.job.amount,
    dispatch_error: null,
  }

  const { data: delivery, error: deliveryError } = existing
    ? await admin
        .from('delivery')
        .update(deliveryRow)
        .eq('id', existing.id)
        .select()
        .single()
    : await admin.from('delivery').insert(deliveryRow).select().single()

  if (deliveryError) {
    return jsonResponse(
      {
        error: `Pidge job ${result.job.jobId} was created but could not be saved: ${deliveryError.message}`,
      },
      500,
    )
  }

  await admin
    .from('orders')
    .update({ order_status: 'out_for_delivery', delivery_provider: 'pidge' })
    .eq('id', order.id)

  return jsonResponse({ delivery, job: result.job })
})
