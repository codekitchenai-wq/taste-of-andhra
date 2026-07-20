import type { OrderStatus } from '@/types/enums'
import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import { Badge } from '@/components/ui/Badge'

interface OrderStatusBadgeProps {
  status: OrderStatus
}

const statusVariant: Record<
  OrderStatus,
  'default' | 'featured' | 'veg' | 'unavailable' | 'nonVeg'
> = {
  pending: 'default',
  confirmed: 'featured',
  preparing: 'featured',
  ready: 'veg',
  out_for_delivery: 'featured',
  delivered: 'veg',
  cancelled: 'unavailable',
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <Badge variant={statusVariant[status]}>{ORDER_STATUS[status]}</Badge>
  )
}
