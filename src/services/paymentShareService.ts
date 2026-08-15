import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import { APP_NAME } from '@/constants/APP'
import { PLATFORM_WWW_URL } from '@/constants/PLATFORM'
import { ROUTES } from '@/constants/ROUTES'
import { supabase } from '@/services/supabaseClient'
import { formatPrice } from '@/utils/format'

export interface PaymentShareItem {
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface PaymentShareView {
  orderId: string
  orderNumber: string
  guestName: string | null
  fulfillmentType: 'delivery' | 'pickup'
  paymentStatus: string
  orderStatus: string
  subtotal: number
  tax: number
  deliveryCharge: number
  discount: number
  total: number
  items: PaymentShareItem[]
  upiVpa: string
  upiPayeeName: string
}

function mapShare(raw: Record<string, unknown>): PaymentShareView {
  const itemsRaw = Array.isArray(raw.items) ? raw.items : []
  return {
    orderId: String(raw.order_id ?? ''),
    orderNumber: String(raw.order_number ?? ''),
    guestName: (raw.guest_name as string | null) ?? null,
    fulfillmentType:
      raw.fulfillment_type === 'pickup' ? 'pickup' : 'delivery',
    paymentStatus: String(raw.payment_status ?? 'pending'),
    orderStatus: String(raw.order_status ?? ''),
    subtotal: Number(raw.subtotal ?? 0),
    tax: Number(raw.tax ?? 0),
    deliveryCharge: Number(raw.delivery_charge ?? 0),
    discount: Number(raw.discount ?? 0),
    total: Number(raw.total ?? 0),
    items: itemsRaw.map((row) => {
      const item = row as Record<string, unknown>
      return {
        name: String(item.name ?? 'Item'),
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unit_price ?? 0),
        lineTotal: Number(item.line_total ?? 0),
      }
    }),
    upiVpa: String(raw.upi_vpa ?? '').trim(),
    upiPayeeName: String(raw.upi_payee_name ?? '').trim() || APP_NAME,
  }
}

export async function getPaymentShareByToken(
  token: string,
): Promise<ServiceResponse<PaymentShareView>> {
  const trimmed = token.trim()
  if (!trimmed) {
    return createErrorResponse('Payment link is invalid.')
  }

  const { data, error } = await supabase.rpc('get_payment_share', {
    p_token: trimmed,
  })

  if (error) {
    return createErrorResponse(
      'Unable to load payment details.',
      error.message,
    )
  }

  if (!data || typeof data !== 'object') {
    return createErrorResponse('This payment link is invalid or expired.')
  }

  return createSuccessResponse(mapShare(data as Record<string, unknown>))
}

export function paymentSharePath(token: string): string {
  return ROUTES.ORDER_PAYMENT_SHARE(token)
}

export function paymentShareAbsoluteUrl(token: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : PLATFORM_WWW_URL
  return `${origin.replace(/\/$/, '')}${paymentSharePath(token)}`
}

/** WhatsApp / copy text with order details + payment page link. */
export function buildPaymentShareMessage(
  share: Pick<
    PaymentShareView,
    | 'orderNumber'
    | 'guestName'
    | 'fulfillmentType'
    | 'items'
    | 'subtotal'
    | 'tax'
    | 'deliveryCharge'
    | 'discount'
    | 'total'
  >,
  pageUrl: string,
): string {
  const lines: string[] = [
    `${APP_NAME} — Order ${share.orderNumber}`,
    share.guestName ? `Hi ${share.guestName},` : 'Hi,',
    share.fulfillmentType === 'pickup'
      ? 'Your pickup order is confirmed.'
      : 'Your delivery order is confirmed.',
    '',
    'Items:',
  ]

  for (const item of share.items) {
    lines.push(
      `• ${item.quantity}× ${item.name} — ${formatPrice(item.lineTotal)}`,
    )
  }

  lines.push('')
  lines.push(`Subtotal: ${formatPrice(share.subtotal)}`)
  lines.push(`GST: ${formatPrice(share.tax)}`)
  if (share.deliveryCharge > 0) {
    lines.push(`Delivery: ${formatPrice(share.deliveryCharge)}`)
  }
  if (share.discount > 0) {
    lines.push(`Discount: -${formatPrice(share.discount)}`)
  }
  lines.push(`Total: ${formatPrice(share.total)}`)
  lines.push('')
  lines.push('Pay securely here (order details + UPI QR):')
  lines.push(pageUrl)

  return lines.join('\n')
}

export function whatsappShareUrl(phone10: string, message: string): string {
  const digits = phone10.replace(/\D/g, '').slice(-10)
  const text = encodeURIComponent(message)
  if (digits.length === 10) {
    return `https://wa.me/91${digits}?text=${text}`
  }
  return `https://wa.me/?text=${text}`
}
