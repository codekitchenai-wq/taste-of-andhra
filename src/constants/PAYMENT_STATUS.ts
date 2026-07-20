import type { PaymentStatus } from '@/types/enums'

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
}
