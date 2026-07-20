import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { ROUTES } from '@/constants/ROUTES'
import type { Order } from '@/types/Order'

interface OrderListCardProps {
  order: Order
  itemCount?: number
}

const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function OrderListCard({ order, itemCount }: OrderListCardProps) {
  return (
    <Link
      to={ROUTES.ORDER_DETAILS(order.id)}
      className="group block rounded-[var(--radius-card)] bg-surface p-5 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-text-primary group-hover:text-primary">
            {order.order_number}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {dateFormatter.format(new Date(order.created_at))}
          </p>
          {itemCount !== undefined && (
            <p className="mt-1 text-sm text-text-secondary">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <OrderStatusBadge status={order.order_status} />
          <p className="font-semibold text-primary">
            {priceFormatter.format(order.total)}
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
