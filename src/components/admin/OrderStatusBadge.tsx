import type { OrderStatus } from '@/types/enums'
import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import { cn } from '@/utils/cn'

interface OrderStatusBadgeProps {
  status: OrderStatus
}

const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-[#FC8019] text-white',
  confirmed: 'bg-secondary/15 text-secondary',
  preparing: 'bg-primary/15 text-primary',
  ready: 'bg-success/15 text-success',
  out_for_delivery: 'bg-accent/30 text-text-primary',
  delivered: 'bg-success text-white',
  cancelled: 'bg-error/15 text-error',
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide',
        statusStyles[status],
      )}
    >
      {ORDER_STATUS[status]}
    </span>
  )
}
