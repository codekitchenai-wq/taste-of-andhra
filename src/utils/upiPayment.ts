export interface UpiPaymentParams {
  vpa: string
  payeeName: string
  amount: number
  note: string
}

/** Builds a UPI intent URL suitable for QR encoding. */
export function buildUpiPayUrl(params: UpiPaymentParams): string | null {
  const vpa = params.vpa.trim()
  if (!vpa || !vpa.includes('@')) return null

  const amount = Math.round(params.amount * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0) return null

  const query = new URLSearchParams({
    pa: vpa,
    pn: params.payeeName.trim() || 'Restaurant',
    am: amount.toFixed(2),
    cu: 'INR',
    tn: params.note.trim().slice(0, 80) || 'Order payment',
  })

  return `upi://pay?${query.toString()}`
}

export function buildUpiQrImageUrl(upiUrl: string, size = 280): string {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data: upiUrl,
  })
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`
}

/**
 * Show UPI QR whenever pay-later is still unpaid (storefront + phone/counter).
 * Cancelled / paid orders never show the collect QR.
 */
export function canShowPayLaterQr(input: {
  paymentMethod: string
  paymentStatus: string
  orderStatus: string
  fulfillmentType: string
}): boolean {
  if (input.paymentMethod !== 'pay_later') return false
  if (input.paymentStatus !== 'pending') return false
  if (input.orderStatus === 'cancelled') return false
  return true
}
