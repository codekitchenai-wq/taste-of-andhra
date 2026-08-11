import { Eye } from 'lucide-react'
import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import type { AdminOrder } from '@/services/orderService'
import type { OrderStatus } from '@/types/enums'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { OrderEtaBanner } from '@/components/orders/OrderEtaBanner'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { PAYMENT_METHOD } from '@/constants/PAYMENT_METHOD'
import { formatPrice, formatDateTime } from '@/utils/format'
import { getAllowedNextStatuses } from '@/utils/orderStatusTransitions'
import { isOrderDelayed } from '@/utils/orderEta'
import { cn } from '@/utils/cn'

interface OrderTableProps {
  orders: AdminOrder[]
  onStatusChange: (orderId: string, status: OrderStatus) => void
  onView?: (orderId: string) => void
  isUpdating?: boolean
}

export function OrderTable({
  orders,
  onStatusChange,
  onView,
  isUpdating = false,
}: OrderTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead className="border-b border-black/5 bg-background/60">
          <tr>
            <th className="px-4 py-3 font-semibold text-text-primary">Order</th>
            <th className="px-4 py-3 font-semibold text-text-primary">
              Customer
            </th>
            <th className="px-4 py-3 font-semibold text-text-primary">Total</th>
            <th className="px-4 py-3 font-semibold text-text-primary">
              Payment
            </th>
            <th className="px-4 py-3 font-semibold text-text-primary">Status</th>
            <th className="px-4 py-3 font-semibold text-text-primary">ETA</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Date</th>
            <th className="px-4 py-3 font-semibold text-text-primary">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const nextStatuses = getAllowedNextStatuses(
              order.order_status,
              order.fulfillment_type,
            )
            const statusOptions = [order.order_status, ...nextStatuses]
            const delayed = isOrderDelayed(order)

            return (
              <tr
                key={order.id}
                className={cn(
                  'border-b border-black/5 last:border-b-0',
                  delayed && 'bg-error/5',
                )}
              >
                <td className="px-4 py-4 font-medium text-text-primary">
                  <OrderNumberDisplay value={order.order_number} />
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-text-primary">
                    {order.customer_name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {order.customer_email}
                  </p>
                </td>
                <td className="px-4 py-4 font-medium text-text-primary">
                  {formatPrice(order.total)}
                </td>
                <td className="px-4 py-4 text-text-secondary">
                  {PAYMENT_METHOD[order.payment_method]}
                </td>
                <td className="px-4 py-4">
                  <OrderStatusBadge status={order.order_status} />
                </td>
                <td className="px-4 py-4">
                  <OrderEtaBanner
                    estimatedDelivery={order.estimated_delivery}
                    orderStatus={order.order_status}
                    variant="badge"
                  />
                </td>
                <td className="px-4 py-4 text-text-secondary">
                  {formatDateTime(new Date(order.created_at))}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {onView && (
                      <button
                        type="button"
                        onClick={() => onView(order.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
                        aria-label={`View ${order.order_number}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <select
                      value={order.order_status}
                      disabled={isUpdating || nextStatuses.length === 0}
                      onChange={(event) =>
                        onStatusChange(
                          order.id,
                          event.target.value as OrderStatus,
                        )
                      }
                      className="h-10 rounded-[var(--radius-input)] border border-gray-300 bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      aria-label={`Update status for ${order.order_number}`}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {ORDER_STATUS[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
