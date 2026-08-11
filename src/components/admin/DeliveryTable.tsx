import { useState } from 'react'
import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import type { DeliveryWithOrder } from '@/services/deliveryService'
import type { OrderStatus } from '@/types/enums'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { LiveTrackingMap } from '@/components/orders/LiveTrackingMap'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { Button } from '@/components/ui/Button'
import { formatDateTime, formatPrice } from '@/utils/format'
import { getAllowedNextStatuses } from '@/utils/orderStatusTransitions'

interface DeliveryTableProps {
  deliveries: DeliveryWithOrder[]
  onStatusChange: (deliveryId: string, status: OrderStatus) => void
  isUpdating?: boolean
}

export function DeliveryTable({
  deliveries,
  onStatusChange,
  isUpdating = false,
}: DeliveryTableProps) {
  const [trackedDeliveryId, setTrackedDeliveryId] = useState<string | null>(null)

  const trackedDelivery =
    deliveries.find((delivery) => delivery.id === trackedDeliveryId) ?? null

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="border-b border-black/5 bg-background/60">
            <tr>
              <th className="px-4 py-3 font-semibold text-text-primary">
                Order
              </th>
              <th className="px-4 py-3 font-semibold text-text-primary">
                Customer
              </th>
              <th className="px-4 py-3 font-semibold text-text-primary">
                Partner
              </th>
              <th className="px-4 py-3 font-semibold text-text-primary">
                Total
              </th>
              <th className="px-4 py-3 font-semibold text-text-primary">
                Status
              </th>
              <th className="px-4 py-3 font-semibold text-text-primary">
                Assigned
              </th>
              <th className="px-4 py-3 font-semibold text-text-primary">
                Update
              </th>
              <th className="px-4 py-3 font-semibold text-text-primary">
                Location
              </th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => {
              const nextStatuses = getAllowedNextStatuses(
                delivery.status,
              ).filter(
                (status) =>
                  status === 'out_for_delivery' || status === 'delivered',
              )
              const statusOptions = [delivery.status, ...nextStatuses]
              const canUpdate =
                nextStatuses.length > 0 && delivery.status !== 'delivered'
              const isTracked = trackedDeliveryId === delivery.id

              return (
                <tr
                  key={delivery.id}
                  className="border-b border-black/5 last:border-b-0"
                >
                  <td className="px-4 py-4 font-medium text-text-primary">
                    <OrderNumberDisplay value={delivery.order_number} />
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
                      disabled={isUpdating || !canUpdate}
                      onChange={(event) =>
                        onStatusChange(
                          delivery.id,
                          event.target.value as OrderStatus,
                        )
                      }
                      className="h-10 rounded-[var(--radius-input)] border border-gray-300 bg-surface px-3 text-sm"
                      aria-label={`Update delivery status for ${delivery.order_number}`}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {ORDER_STATUS[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <Button
                      type="button"
                      size="sm"
                      variant={isTracked ? 'secondary' : 'ghost'}
                      onClick={() =>
                        setTrackedDeliveryId(isTracked ? null : delivery.id)
                      }
                      aria-expanded={isTracked}
                    >
                      {isTracked ? 'Hide map' : 'Track'}
                    </Button>
                    <p className="mt-1 text-xs text-text-secondary">
                      {delivery.location_updated_at
                        ? `GPS ${new Date(
                            delivery.location_updated_at,
                          ).toLocaleTimeString()}`
                        : 'Partner not sharing GPS'}
                    </p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {trackedDelivery && (
        <section className="rounded-[var(--radius-card)] bg-surface p-4 shadow-md">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold text-text-primary">
              <OrderNumberDisplay value={trackedDelivery.order_number} /> ·{' '}
              {trackedDelivery.delivery_partner ?? 'Unassigned partner'}
            </h4>
            <p className="text-xs text-text-secondary">
              Drop-off:{' '}
              {trackedDelivery.delivery_address ?? 'Address unavailable'}
            </p>
          </div>
          <LiveTrackingMap
            key={trackedDelivery.id}
            orderId={trackedDelivery.order_id}
            dropoffLat={trackedDelivery.dropoff_lat}
            dropoffLng={trackedDelivery.dropoff_lng}
          />
        </section>
      )}
    </div>
  )
}
