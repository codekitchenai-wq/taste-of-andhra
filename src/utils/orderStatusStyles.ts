import type { OrderStatus } from '@/types/enums'

/** Active kitchen pipeline — excludes delivered & cancelled. */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
]

export function isActiveOrderStatus(status: OrderStatus): boolean {
  return ACTIVE_ORDER_STATUSES.includes(status)
}

/**
 * Status colours: early stages dark → lighter progression,
 * then teal/blue for ready/transit, green delivered, orange cancelled.
 */
export const ORDER_STATUS_BADGE_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-[#1C1917] text-white',
  confirmed: 'bg-[#44403C] text-white',
  preparing: 'bg-[#9A3412] text-white',
  ready: 'bg-[#0F766E] text-white',
  out_for_delivery: 'bg-[#1D4ED8] text-white',
  delivered: 'bg-[#15803D] text-white',
  cancelled: 'bg-[#EA580C] text-white',
}

/** Soft card / column accents matching the badge palette. */
export const ORDER_STATUS_SURFACE_STYLES: Record<OrderStatus, string> = {
  pending: 'border-[#1C1917]/35 bg-[#1C1917]/5 ring-1 ring-[#1C1917]/10',
  confirmed: 'border-[#44403C]/30 bg-[#44403C]/5 ring-1 ring-[#44403C]/10',
  preparing: 'border-[#9A3412]/35 bg-[#9A3412]/5 ring-1 ring-[#9A3412]/12',
  ready: 'border-[#0F766E]/35 bg-[#0F766E]/5 ring-1 ring-[#0F766E]/12',
  out_for_delivery:
    'border-[#1D4ED8]/35 bg-[#1D4ED8]/5 ring-1 ring-[#1D4ED8]/12',
  delivered: 'border-[#15803D]/30 bg-[#15803D]/5 ring-1 ring-[#15803D]/10',
  cancelled: 'border-[#EA580C]/35 bg-[#EA580C]/10 ring-1 ring-[#EA580C]/12',
}

export const ORDER_STATUS_HEADER_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-[#1C1917] text-white shadow-sm',
  confirmed: 'bg-[#57534E] text-white shadow-sm',
  preparing: 'bg-[#C2410C] text-white shadow-sm',
  ready: 'bg-[#0D9488] text-white shadow-sm',
  out_for_delivery: 'bg-[#2563EB] text-white shadow-sm',
  delivered: 'bg-[#16A34A] text-white shadow-sm',
  cancelled: 'bg-[#F97316] text-white shadow-sm',
}

export const ORDER_STATUS_FILTER_ACTIVE_STYLES: Record<OrderStatus, string> = {
  pending: 'border-transparent bg-[#1C1917] text-white hover:bg-[#292524]',
  confirmed: 'border-transparent bg-[#44403C] text-white hover:bg-[#57534E]',
  preparing: 'border-transparent bg-[#9A3412] text-white hover:bg-[#7C2D12]',
  ready: 'border-transparent bg-[#0F766E] text-white hover:bg-[#0D9488]',
  out_for_delivery:
    'border-transparent bg-[#1D4ED8] text-white hover:bg-[#1E40AF]',
  delivered: 'border-transparent bg-[#15803D] text-white hover:bg-[#166534]',
  cancelled: 'border-transparent bg-[#EA580C] text-white hover:bg-[#C2410C]',
}
