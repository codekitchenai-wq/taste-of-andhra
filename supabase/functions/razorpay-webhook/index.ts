// Razorpay webhook — idempotent payment capture.
//
// Deploy: supabase functions deploy razorpay-webhook --no-verify-jwt
// Secrets:
//   RAZORPAY_WEBHOOK_SECRET=...
//   RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... (optional verify fetch)
//
// Dashboard → Webhooks → URL:
//   https://<project-ref>.supabase.co/functions/v1/razorpay-webhook
// Events: payment.captured, order.paid

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  getAdminClient,
  markPaymentPaid,
  recordWebhookEvent,
} from '../_shared/razorpayPayments.ts'

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body),
  )
  return [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
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

  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')?.trim() ?? ''
  if (!webhookSecret) {
    return errorResponse('Webhook is not configured.', 500)
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''
  const expected = await hmacSha256Hex(webhookSecret, rawBody)

  if (!signature || !safeEqual(signature, expected)) {
    return errorResponse('Invalid webhook signature.', 401)
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return errorResponse('Invalid JSON body.')
  }

  const eventId =
    String(payload.id ?? '').trim() ||
    `${String(payload.event ?? 'event')}_${Date.now()}`
  const eventType = String(payload.event ?? '')

  let admin
  try {
    admin = getAdminClient()
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Server misconfigured.',
      500,
    )
  }

  const recorded = await recordWebhookEvent(admin, {
    providerEventId: eventId,
    eventType,
    payload,
  })

  if (!recorded.inserted) {
    return jsonResponse({ ok: true, duplicate: true })
  }

  if (
    eventType !== 'payment.captured' &&
    eventType !== 'order.paid' &&
    eventType !== 'payment.authorized'
  ) {
    return jsonResponse({ ok: true, ignored: eventType })
  }

  const entity =
    (
      (payload.payload as Record<string, unknown> | undefined)?.payment as
        | Record<string, unknown>
        | undefined
    )?.entity ??
    (
      (payload.payload as Record<string, unknown> | undefined)?.order as
        | Record<string, unknown>
        | undefined
    )?.entity

  if (!entity || typeof entity !== 'object') {
    return jsonResponse({ ok: true, ignored: 'no_entity' })
  }

  const paymentEntity = entity as Record<string, unknown>
  const providerPaymentId = String(paymentEntity.id ?? '').trim()
  const notes = (paymentEntity.notes ?? {}) as Record<string, unknown>
  const orderIdFromNotes = String(notes.order_id ?? notes.orderId ?? '').trim()

  let orderId = orderIdFromNotes

  if (!orderId && providerPaymentId) {
    const { data: byProvider } = await admin
      .from('payments')
      .select('order_id')
      .eq('provider_payment_id', providerPaymentId)
      .maybeSingle()
    orderId = String(byProvider?.order_id ?? '')
  }

  if (!orderId && typeof paymentEntity.order_id === 'string') {
    const { data: byRzpOrder } = await admin
      .from('payments')
      .select('order_id')
      .eq('provider_order_id', paymentEntity.order_id)
      .maybeSingle()
    orderId = String(byRzpOrder?.order_id ?? '')
  }

  if (!orderId) {
    return jsonResponse({
      ok: true,
      unmatched: true,
      providerPaymentId: providerPaymentId || null,
    })
  }

  try {
    const result = await markPaymentPaid(admin, {
      orderId,
      transactionId: providerPaymentId || `rzp_wh_${Date.now()}`,
      providerPaymentId: providerPaymentId || null,
      providerOrderId:
        typeof paymentEntity.order_id === 'string'
          ? paymentEntity.order_id
          : null,
      paymentMode: 'DIRECT',
      metadata: {
        confirm_path: 'razorpay_webhook',
        event_type: eventType,
        event_id: eventId,
      },
    })

    await admin
      .from('razorpay_webhook_events')
      .update({
        organization_id: (result.payment.organization_id as string) ?? null,
        payment_id: (result.payment.id as string) ?? null,
      })
      .eq('provider_event_id', eventId)

    return jsonResponse({
      ok: true,
      alreadyPaid: result.alreadyPaid,
      orderId,
    })
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Webhook processing failed.',
      500,
    )
  }
})
