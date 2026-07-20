import type { Offer } from '@/types/Offer'

export function mapOffer(row: Record<string, unknown>): Offer {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    discount_percentage: Number(row.discount_percentage),
    minimum_order: Number(row.minimum_order),
    coupon_code: (row.coupon_code as string | null) ?? null,
    start_date: row.start_date as string,
    end_date: row.end_date as string,
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
  }
}
