// Confirms a Razorpay (or demo) payment server-side. Clients must not mark paid.
//
// Deploy: supabase functions deploy razorpay-confirm
// Secrets (production):
//   supabase secrets set RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=...
// Optional: ALLOW_DEMO_PAYMENTS=true for staging without Razorpay secrets

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  demoPaymentsAllowed,
  fetchRazorpayPayment,
  getAdminClient,
  markPaymentPaid,
} from '../_shared/razorpayPayments.ts'

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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!supabaseUrl || !anonKey) {
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body.')
  }

  const orderId = String(body.orderId ?? '').trim()
  const razorpayPaymentId = String(
    body.razorpay_payment_id ?? body.transactionId ?? '',
  ).trim()
  const razorpayOrderId = String(body.razorpay_order_id ?? '').trim() || null

  if (!orderId) {
    return errorResponse('orderId is required.')
  }
  if (!razorpayPaymentId) {
    return errorResponse('razorpay_payment_id is required.')
  }

  let admin
  try {
    admin = getAdminClient()
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Server misconfigured.',
      500,
    )
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, user_id, organization_id, total, payment_status')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError || !order) {
    return errorResponse('Order not found.', 404)
  }

  const { data: membership } = await admin
    .from('organization_members')
    .select('role')
    .eq('organization_id', order.organization_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isOwner = order.user_id === user.id
  const isOrgAdmin =
    membership?.role === 'restaurant_owner' ||
    membership?.role === 'restaurant_admin'
  const isPlatformMaster = profile?.role === 'platform_master'

  if (!isOwner && !isOrgAdmin && !isPlatformMaster) {
    return errorResponse('Not allowed to confirm this payment.', 403)
  }

  const isDemo =
    razorpayPaymentId.startsWith('demo_') || body.mode === 'demo'

  if (isDemo) {
    if (!demoPaymentsAllowed()) {
      return errorResponse('Demo payments are disabled on this environment.', 403)
    }

    try {
      const result = await markPaymentPaid(admin, {
        orderId,
        transactionId: razorpayPaymentId,
        providerPaymentId: razorpayPaymentId,
        providerOrderId: razorpayOrderId,
        paymentMode: 'DIRECT',
        metadata: { confirm_path: 'demo' },
      })
      return jsonResponse({
        success: true,
        alreadyPaid: result.alreadyPaid,
        mode: 'demo',
        payment: result.payment,
      })
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : 'Unable to confirm payment.',
        500,
      )
    }
  }

  const remote = await fetchRazorpayPayment(razorpayPaymentId)
  if (!remote) {
    return errorResponse(
      'Unable to verify payment with Razorpay. Check server keys.',
      502,
    )
  }

  const status = String(remote.status ?? '')
  if (status !== 'captured' && status !== 'authorized') {
    return errorResponse(`Payment not successful (status: ${status || 'unknown'}).`)
  }

  const amountPaise = Number(remote.amount ?? NaN)
  const expectedPaise = Math.round(Number(order.total) * 100)
  if (Number.isFinite(amountPaise) && amountPaise !== expectedPaise) {
    return errorResponse('Payment amount does not match order total.', 409)
  }

  const notes = (remote.notes ?? {}) as Record<string, unknown>
  if (notes.order_id && String(notes.order_id) !== orderId) {
    return errorResponse('Payment is not linked to this order.', 409)
  }

  try {
    const result = await markPaymentPaid(admin, {
      orderId,
      transactionId: razorpayPaymentId,
      providerPaymentId: razorpayPaymentId,
      providerOrderId:
        razorpayOrderId ??
        (typeof remote.order_id === 'string' ? remote.order_id : null),
      paymentMode: 'DIRECT',
      metadata: {
        confirm_path: 'razorpay_api',
        razorpay_status: status,
        razorpay_method: remote.method ?? null,
      },
    })

    return jsonResponse({
      success: true,
      alreadyPaid: result.alreadyPaid,
      mode: 'live',
      payment: result.payment,
    })
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Unable to confirm payment.',
      500,
    )
  }
})
