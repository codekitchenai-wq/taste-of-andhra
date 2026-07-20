import { ORDER_STATUS, ORDER_STATUS_LIST } from '@/constants/ORDER_STATUS'
import type { AdminOrder } from '@/services/orderService'
import type { OrderStatus } from '@/types/enums'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { PAYMENT_METHOD } from '@/constants/PAYMENT_METHOD'

interface OrderTableProps {
  orders: AdminOrder[]
  onStatusChange: (orderId: string, status: OrderStatus) => void
  isUpdating?: boolean
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

export function OrderTable({
  orders,
  onStatusChange,
  isUpdating = false,
}: OrderTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
      <table className="w-full min-w-[960px] text-left text-sm">
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
            <th className="px-4 py-3 font-semibold text-text-primary">Date</th>
            <th className="px-4 py-3 font-semibold text-text-primary">
              Update
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-black/5 last:border-b-0"
            >
              <td className="px-4 py-4 font-medium text-text-primary">
                {order.order_number}
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
                {priceFormatter.format(order.total)}
              </td>
              <td className="px-4 py-4 text-text-secondary">
                {PAYMENT_METHOD[order.payment_method]}
              </td>
              <td className="px-4 py-4">
                <OrderStatusBadge status={order.order_status} />
              </td>
              <td className="px-4 py-4 text-text-secondary">
                {dateFormatter.format(new Date(order.created_at))}
              </td>
              <td className="px-4 py-4">
                <select
                  value={order.order_status}
                  disabled={isUpdating}
                  onChange={(event) =>
                    onStatusChange(order.id, event.target.value as OrderStatus)
                  }
                  className="h-10 rounded-[var(--radius-input)] border border-gray-300 bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  aria-label={`Update status for ${order.order_number}`}
                >
                  {ORDER_STATUS_LIST.map((status) => (
                    <option key={status} value={status}>
                      {ORDER_STATUS[status]}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
