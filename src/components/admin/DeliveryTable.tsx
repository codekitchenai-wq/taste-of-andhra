import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import type { DeliveryWithOrder } from '@/services/deliveryService'
import type { OrderStatus } from '@/types/enums'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { formatDateTime, formatPrice } from '@/utils/format'

interface DeliveryTableProps {
  deliveries: DeliveryWithOrder[]
  onStatusChange: (deliveryId: string, status: OrderStatus) => void
  isUpdating?: boolean
}

const DELIVERY_STATUSES: OrderStatus[] = [
  'out_for_delivery',
  'delivered',
]

export function DeliveryTable({
  deliveries,
  onStatusChange,
  isUpdating = false,
}: DeliveryTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="border-b border-black/5 bg-background/60">
          <tr>
            <th className="px-4 py-3 font-semibold text-text-primary">Order</th>
            <th className="px-4 py-3 font-semibold text-text-primary">
              Customer
            </th>
            <th className="px-4 py-3 font-semibold text-text-primary">Partner</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Total</th>
            <th className="px-4 py-3 font-semibold text-text-primary">Status</th>
            <th className="px-4 py-3 font-semibold text-text-primary">
              Assigned
            </th>
            <th className="px-4 py-3 font-semibold text-text-primary">Update</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((delivery) => (
            <tr
              key={delivery.id}
              className="border-b border-black/5 last:border-b-0"
            >
              <td className="px-4 py-4 font-medium text-text-primary">
                {delivery.order_number}
              </td>
              <td className="px-4 py-4">
                <p className="font-medium text-text-primary">
                  {delivery.customer_name}
                </p>
                <p className="text-xs text-text-secondary">
                  {delivery.customer_phone ?? '—'}
                </p>
              </td>
              <td className="px-4 py-4">
                <p className="font-medium text-text-primary">
                  {delivery.delivery_partner ?? '—'}
                </p>
                <p className="text-xs text-text-secondary">
                  {delivery.partner_phone ?? '—'}
                </p>
              </td>
              <td className="px-4 py-4 font-medium text-text-primary">
                {formatPrice(delivery.order_total)}
              </td>
              <td className="px-4 py-4">
                <OrderStatusBadge status={delivery.status} />
              </td>
              <td className="px-4 py-4 text-text-secondary">
                {delivery.assigned_at
                  ? formatDateTime(new Date(delivery.assigned_at))
                  : '—'}
              </td>
              <td className="px-4 py-4">
                <select
                  value={delivery.status}
                  disabled={isUpdating || delivery.status === 'delivered'}
                  onChange={(event) =>
                    onStatusChange(
                      delivery.id,
                      event.target.value as OrderStatus,
                    )
                  }
                  className="h-10 rounded-[var(--radius-input)] border border-gray-300 bg-surface px-3 text-sm"
                  aria-label={`Update delivery status for ${delivery.order_number}`}
                >
                  {DELIVERY_STATUSES.map((status) => (
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
