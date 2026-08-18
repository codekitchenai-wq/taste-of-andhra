import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { OnlinePaymentChannel } from '@/constants/PAYMENT_METHOD'
import { supabase } from '@/services/supabaseClient'
import type { Payment } from '@/types/Payment'
import { mapPayment } from '@/utils/mapPayment'
import { razorpayKeyIdForTenant } from '@/utils/tenantPayments'
import { parseStorefrontTheme } from '@/utils/tenantTheme'

export interface RazorpayCheckoutInput {
  orderId: string
  orderNumber: string
  amount: number
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  channel: OnlinePaymentChannel
  restaurantName?: string
}

export interface RazorpayCheckoutResult {
  transactionId: string
  paymentId: string
  mode: 'live' | 'demo'
  channel: OnlinePaymentChannel
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void
      on: (event: string, handler: (response: unknown) => void) => void
    }
  }
}

export function getRazorpayKeyId(input?: {
  settings?: Record<string, unknown> | null
  slug?: string | null
  organizationId?: string | null
}): string | undefined {
  return razorpayKeyIdForTenant(input ?? {})
}

export function isRazorpayConfigured(input?: {
  settings?: Record<string, unknown> | null
  slug?: string | null
  organizationId?: string | null
}): boolean {
  return Boolean(getRazorpayKeyId(input))
}

async function razorpayCheckoutForOrder(orderId: string): Promise<{
  key: string | undefined
  themeColor: string
}> {
  const { data: order } = await supabase
    .from('orders')
    .select('organization_id')
    .eq('id', orderId)
    .maybeSingle()

  const organizationId = (order?.organization_id as string | undefined) ?? null
  if (!organizationId) {
    return { key: undefined, themeColor: parseStorefrontTheme({}).primary }
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('slug, settings, branding')
    .eq('id', organizationId)
    .maybeSingle()

  const branding =
    org?.branding && typeof org.branding === 'object'
      ? (org.branding as Record<string, unknown>)
      : {}

  return {
    key: razorpayKeyIdForTenant({
      settings:
        org?.settings && typeof org.settings === 'object'
          ? (org.settings as Record<string, unknown>)
          : {},
      slug: typeof org?.slug === 'string' ? org.slug : null,
      organizationId,
    }),
    themeColor: parseStorefrontTheme(branding).primary,
  }
}

function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true)

  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function mapPaymentRow(row: Record<string, unknown>): Payment {
  return mapPayment(row)
}

/**
 * Server-side payment confirmation (Razorpay API verify or gated demo).
 * Clients must not UPDATE payments to paid directly.
 */
export async function confirmOnlinePayment(input: {
  orderId: string
  razorpay_payment_id?: string
  razorpay_order_id?: string
  transactionId?: string
  mode?: 'live' | 'demo'
}): Promise<ServiceResponse<Payment>> {
  const { data, error } = await supabase.functions.invoke('razorpay-confirm', {
    body: {
      orderId: input.orderId,
      razorpay_payment_id: input.razorpay_payment_id ?? input.transactionId,
      razorpay_order_id: input.razorpay_order_id,
      transactionId: input.transactionId,
      mode: input.mode,
    },
  })

  if (error) {
    return createErrorResponse(
      'Unable to confirm payment.',
      error.message,
    )
  }

  const payload = data as {
    error?: string
    payment?: Record<string, unknown>
  } | null

  if (!payload || payload.error || !payload.payment) {
    return createErrorResponse(
      payload?.error ?? 'Unable to confirm payment.',
    )
  }

  return createSuccessResponse(mapPaymentRow(payload.payment))
}

/**
 * @deprecated Prefer confirmOnlinePayment — kept only for typed internal use.
 */
export async function markOrderPaid(
  orderId: string,
  transactionId: string,
): Promise<ServiceResponse<Payment>> {
  return confirmOnlinePayment({
    orderId,
    transactionId,
    mode: transactionId.startsWith('demo_') ? 'demo' : 'live',
  })
}

/**
 * Marks a pay-later / COD collection without resetting kitchen status.
 * Org admins only (RLS). Use after customer pays via UPI QR (or cash).
 */
export async function markPaymentCollected(
  orderId: string,
  transactionId?: string,
): Promise<ServiceResponse<Payment>> {
  const paidAt = new Date().toISOString()
  const txn =
    transactionId?.trim() ||
    `upi_collected_${Date.now().toString(36)}`

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      transaction_id: txn,
      provider_payment_id: txn,
      paid_at: paidAt,
      payment_gateway: 'upi_qr',
      provider: 'upi_qr',
      payment_mode: 'DIRECT',
    })
    .eq('order_id', orderId)
    .select()
    .single()

  if (paymentError) {
    return createErrorResponse(
      'Unable to update payment status.',
      paymentError.message,
    )
  }

  const { error: orderError } = await supabase
    .from('orders')
    .update({ payment_status: 'paid' })
    .eq('id', orderId)

  if (orderError) {
    return createErrorResponse(
      'Payment recorded but order payment status update failed.',
      orderError.message,
    )
  }

  return createSuccessResponse(mapPaymentRow(payment))
}

/**
 * Opens Razorpay Checkout with this restaurant's Key ID.
 * Other tenants never inherit Taste of Andhra's env key.
 * Without a tenant key, payment is confirmed in demo mode.
 */
export async function processOnlinePayment(
  input: RazorpayCheckoutInput,
): Promise<ServiceResponse<RazorpayCheckoutResult>> {
  const { key, themeColor } = await razorpayCheckoutForOrder(input.orderId)

  if (!key) {
    const transactionId = `demo_${input.channel}_${Date.now()}`
    const markResult = await confirmOnlinePayment({
      orderId: input.orderId,
      transactionId,
      mode: 'demo',
    })

    if (!markResult.success) {
      return markResult
    }

    return createSuccessResponse({
      transactionId,
      paymentId: markResult.data.id,
      mode: 'demo',
      channel: input.channel,
    })
  }

  const scriptLoaded = await loadRazorpayScript()

  if (!scriptLoaded || !window.Razorpay) {
    return createErrorResponse(
      'Unable to load Razorpay. Check your connection and try again.',
    )
  }

  const amountPaise = Math.round(input.amount * 100)

  return new Promise((resolve) => {
    const razorpay = new window.Razorpay!({
      key,
      amount: amountPaise,
      currency: 'INR',
      name: input.restaurantName?.trim() || 'Restaurant',
      description: `Order ${input.orderNumber}`,
      order_id: undefined,
      notes: {
        order_id: input.orderId,
        order_number: input.orderNumber,
      },
      prefill: {
        name: input.customerName,
        email: input.customerEmail ?? undefined,
        contact: input.customerPhone ?? undefined,
        method: input.channel === 'card' ? 'card' : input.channel,
      },
      theme: { color: themeColor },
      handler: async (response: {
        razorpay_payment_id?: string
        razorpay_order_id?: string
      }) => {
        const transactionId =
          response.razorpay_payment_id ?? `rzp_${Date.now()}`
        const markResult = await confirmOnlinePayment({
          orderId: input.orderId,
          razorpay_payment_id: response.razorpay_payment_id ?? transactionId,
          razorpay_order_id: response.razorpay_order_id,
          mode: 'live',
        })

        if (!markResult.success) {
          resolve(markResult)
          return
        }

        resolve(
          createSuccessResponse({
            transactionId,
            paymentId: markResult.data.id,
            mode: 'live',
            channel: input.channel,
          }),
        )
      },
      modal: {
        ondismiss: () => {
          resolve(createErrorResponse('Payment cancelled.'))
        },
      },
    })

    razorpay.open()
  })
}

export async function verifyPayment(
  transactionId: string,
): Promise<ServiceResponse<Payment>> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('transaction_id', transactionId)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to verify payment.', error.message)
  }

  if (!data) {
    return createErrorResponse('Payment not found.')
  }

  return createSuccessResponse(mapPaymentRow(data))
}
