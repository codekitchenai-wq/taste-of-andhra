import type { Payment } from '@/types/Payment'

export function mapPayment(row: Record<string, unknown>): Payment {
  const mode = row.payment_mode
  return {
    id: row.id as string,
    order_id: row.order_id as string,
    organization_id: (row.organization_id as string | undefined) ?? undefined,
    payment_gateway: row.payment_gateway as string,
    provider: (row.provider as string | undefined) ?? undefined,
    payment_mode: mode === 'ROUTE' || mode === 'DIRECT' ? mode : undefined,
    provider_order_id: (row.provider_order_id as string | null) ?? null,
    provider_payment_id: (row.provider_payment_id as string | null) ?? null,
    transaction_id: (row.transaction_id as string | null) ?? null,
    amount: Number(row.amount),
    status: row.status as Payment['status'],
    paid_at: (row.paid_at as string | null) ?? null,
    created_at: row.created_at as string,
  }
}
