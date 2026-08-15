import type { PaymentStatus } from './enums'

export interface Payment {
  id: string
  order_id: string
  organization_id?: string
  payment_gateway: string
  provider?: string
  payment_mode?: 'DIRECT' | 'ROUTE'
  provider_order_id?: string | null
  provider_payment_id?: string | null
  transaction_id: string | null
  amount: number
  status: PaymentStatus
  paid_at: string | null
  created_at: string
}
