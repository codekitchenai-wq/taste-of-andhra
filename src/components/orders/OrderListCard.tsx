import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { OrderEtaBanner } from '@/components/orders/OrderEtaBanner'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { ROUTES } from '@/constants/ROUTES'
import type { Order } from '@/types/Order'
import { formatPrice, formatDateTime } from '@/utils/format'

interface OrderListCardProps {
  order: Order
  itemCount?: number
}

export function OrderListCard({ order, itemCount }: OrderListCardProps) {
  return (
    <Link
      to={ROUTES.ORDER_DETAILS(order.id)}
      className="group block rounded-[var(--radius-card)] bg-surface p-5 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-text-primary group-hover:text-primary">
            <OrderNumberDisplay value={order.order_number} />
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {formatDateTime(order.created_at)}
          </p>
          {itemCount !== undefined && (
            <p className="mt-1 text-sm text-text-secondary">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
          )}
          <div className="mt-2">
            <OrderEtaBanner
              estimatedDelivery={order.estimated_delivery}
              orderStatus={order.order_status}
              variant="badge"
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <OrderStatusBadge status={order.order_status} />
          <p className="font-semibold text-primary">
            {formatPrice(order.total)}
          </p>
          <ChevronRight
            className="h-5 w-5 text-text-secondary transition-colors group-hover:text-primary"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  )
}
