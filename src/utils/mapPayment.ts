import type { Payment } from '@/types/Payment'

export function mapPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    order_id: row.order_id as string,
    payment_gateway: row.payment_gateway as string,
    transaction_id: (row.transaction_id as string | null) ?? null,
    amount: Number(row.amount),
    status: row.status as Payment['status'],
    paid_at: (row.paid_at as string | null) ?? null,
    created_at: row.created_at as string,
  }
}
