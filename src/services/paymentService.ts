import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { OnlinePaymentChannel } from '@/constants/PAYMENT_METHOD'
import { supabase } from '@/services/supabaseClient'
import type { Payment } from '@/types/Payment'
import { mapPayment } from '@/utils/mapPayment'

export interface RazorpayCheckoutInput {
  orderId: string
  orderNumber: string
  amount: number
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  channel: OnlinePaymentChannel
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

export function getRazorpayKeyId(): string | undefined {
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim()
  if (!key || key.includes('your_razorpay')) return undefined
  return key
}

export function isRazorpayConfigured(): boolean {
  return Boolean(getRazorpayKeyId())
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

export async function markOrderPaid(
  orderId: string,
  transactionId: string,
): Promise<ServiceResponse<Payment>> {
  const paidAt = new Date().toISOString()

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      transaction_id: transactionId,
      paid_at: paidAt,
      payment_gateway: 'razorpay',
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

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      order_status: 'confirmed',
    })
    .eq('id', orderId)
    .select('id, user_id, order_number')
    .single()

  if (orderError) {
    return createErrorResponse(
      'Payment recorded but order status update failed.',
      orderError.message,
    )
  }

  if (order) {
    const { notifyOrderStatus } = await import('@/services/notificationService')
    void notifyOrderStatus(
      order.user_id as string,
      order.id as string,
      order.order_number as string,
      'confirmed',
    )
  }

  return createSuccessResponse(mapPaymentRow(payment))
}

/**
 * Marks a pay-later / COD collection without resetting kitchen status.
 * Use after the customer pays via UPI QR (or cash) at pickup/delivery.
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
      paid_at: paidAt,
      payment_gateway: 'upi_qr',
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
 * Opens Razorpay Checkout when VITE_RAZORPAY_KEY_ID is set.
 * Otherwise resolves with a demo transaction so the UI can be tested.
 */
export async function processOnlinePayment(
  input: RazorpayCheckoutInput,
): Promise<ServiceResponse<RazorpayCheckoutResult>> {
  const key = getRazorpayKeyId()

  if (!key) {
    const transactionId = `demo_${input.channel}_${Date.now()}`
    const markResult = await markOrderPaid(input.orderId, transactionId)

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
      name: 'The Taste of Andhra',
      description: `Order ${input.orderNumber}`,
      order_id: undefined,
      prefill: {
        name: input.customerName,
        email: input.customerEmail ?? undefined,
        contact: input.customerPhone ?? undefined,
        method: input.channel === 'card' ? 'card' : input.channel,
      },
      theme: { color: '#C62828' },
      handler: async (response: {
        razorpay_payment_id?: string
        razorpay_order_id?: string
      }) => {
        const transactionId =
          response.razorpay_payment_id ?? `rzp_${Date.now()}`
        const markResult = await markOrderPaid(input.orderId, transactionId)

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
