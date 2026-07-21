import type { PaymentMethod } from '@/types/enums'

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  cod: 'Cash on Delivery',
  razorpay: 'Pay Online',
}

export type OnlinePaymentChannel = 'upi' | 'card' | 'netbanking' | 'wallet'

export const ONLINE_PAYMENT_CHANNELS: {
  id: OnlinePaymentChannel
  label: string
  description: string
}[] = [
  {
    id: 'upi',
    label: 'UPI',
    description: 'GPay, PhonePe, Paytm, and other UPI apps',
  },
  {
    id: 'card',
    label: 'Credit / Debit Card',
    description: 'Visa, Mastercard, RuPay, Amex',
  },
  {
    id: 'netbanking',
    label: 'Net Banking',
    description: 'All major Indian banks',
  },
  {
    id: 'wallet',
    label: 'Wallets',
    description: 'Paytm, Amazon Pay, and more',
  },
]
