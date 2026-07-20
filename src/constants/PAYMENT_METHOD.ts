import type { PaymentMethod } from '@/types/enums'

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  cod: 'Cash on Delivery',
  razorpay: 'Online Payment',
}
