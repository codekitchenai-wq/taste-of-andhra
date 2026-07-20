import type { PaymentStatus } from './enums'

export interface Payment {
  id: string
  order_id: string
  payment_gateway: string
  transaction_id: string | null
  amount: number
  status: PaymentStatus
  paid_at: string | null
  created_at: string
}
