import type { OrderStatus } from '@/types/enums'
import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import { cn } from '@/utils/cn'
import { ORDER_STATUS_BADGE_STYLES } from '@/utils/orderStatusStyles'

interface OrderStatusBadgeProps {
  status: OrderStatus
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide',
        ORDER_STATUS_BADGE_STYLES[status],
      )}
    >
      {ORDER_STATUS[status]}
    </span>
  )
}
