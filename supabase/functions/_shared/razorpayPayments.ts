// Shared helpers for Razorpay confirm + webhook (service-role DB writes).

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export type AdminClient = SupabaseClient

export function getAdminClient(): AdminClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server is missing Supabase credentials.')
  }
  return createClient(supabaseUrl, serviceRoleKey)
}

export function getRazorpayAuthHeader(): string | null {
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')?.trim()
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')?.trim()
  if (!keyId || !keySecret) return null
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`
}

export function demoPaymentsAllowed(): boolean {
  if (Deno.env.get('ALLOW_DEMO_PAYMENTS') === 'true') return true
  return !Deno.env.get('RAZORPAY_KEY_SECRET')?.trim()
}

export async function fetchRazorpayPayment(
  paymentId: string,
): Promise<Record<string, unknown> | null> {
  const auth = getRazorpayAuthHeader()
  if (!auth) return null

  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Authorization: auth } },
  )

  if (!response.ok) return null
  return (await response.json()) as Record<string, unknown>
}

export async function markPaymentPaid(
  admin: AdminClient,
  input: {
    orderId: string
    transactionId: string
    providerPaymentId?: string | null
    providerOrderId?: string | null
    paymentMode?: 'DIRECT' | 'ROUTE'
    provider?: string
    metadata?: Record<string, unknown>
    confirmOrderStatus?: boolean
  },
): Promise<{ payment: Record<string, unknown>; alreadyPaid: boolean }> {
  const paidAt = new Date().toISOString()
  const paymentMode = input.paymentMode ?? 'DIRECT'
  const provider = input.provider ?? 'razorpay'

  const { data: existing, error: existingError } = await admin
    .from('payments')
    .select('*')
    .eq('order_id', input.orderId)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }
  if (!existing) {
    throw new Error('Payment record not found for order.')
  }

  if (existing.status === 'paid') {
    return { payment: existing as Record<string, unknown>, alreadyPaid: true }
  }

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .update({
      status: 'paid',
      transaction_id: input.transactionId,
      provider_payment_id: input.providerPaymentId ?? input.transactionId,
      provider_order_id: input.providerOrderId ?? null,
      payment_gateway: provider,
      provider,
      payment_mode: paymentMode,
      paid_at: paidAt,
      metadata: {
        ...((existing.metadata as Record<string, unknown>) ?? {}),
        ...(input.metadata ?? {}),
      },
    })
    .eq('id', existing.id)
    .select('*')
    .single()

  if (paymentError || !payment) {
    throw new Error(paymentError?.message ?? 'Unable to update payment.')
  }

  const orderPatch: Record<string, unknown> = {
    payment_status: 'paid',
  }
  if (input.confirmOrderStatus !== false) {
    orderPatch.order_status = 'confirmed'
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .update(orderPatch)
    .eq('id', input.orderId)
    .select('id, user_id, order_number, organization_id, order_status')
    .single()

  if (orderError) {
    throw new Error(orderError.message)
  }

  // Best-effort notification row (same pattern as other flows).
  if (order && input.confirmOrderStatus !== false) {
    await admin
      .from('notifications')
      .insert({
        user_id: order.user_id,
        organization_id: order.organization_id,
        order_id: order.id,
        title: 'Order confirmed',
        body: `Payment received for order ${order.order_number}.`,
        notification_type: 'order_status',
        channel: 'in_app',
      })
      .then(() => undefined, () => undefined)
  }

  return { payment: payment as Record<string, unknown>, alreadyPaid: false }
}

export async function recordWebhookEvent(
  admin: AdminClient,
  input: {
    providerEventId: string
    eventType?: string
    organizationId?: string | null
    paymentId?: string | null
    payload: Record<string, unknown>
  },
): Promise<{ inserted: boolean }> {
  const { error } = await admin.from('razorpay_webhook_events').insert({
    provider_event_id: input.providerEventId,
    event_type: input.eventType ?? null,
    organization_id: input.organizationId ?? null,
    payment_id: input.paymentId ?? null,
    payload: input.payload,
  })

  if (error) {
    if (error.code === '23505') {
      return { inserted: false }
    }
    throw new Error(error.message)
  }
  return { inserted: true }
}
