import { useState } from 'react'
import toast from 'react-hot-toast'
import { AssignDeliveryModal } from '@/components/admin/AssignDeliveryModal'
import { DeliveryTable } from '@/components/admin/DeliveryTable'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import { useAdminDeliveries } from '@/hooks/useAdminDeliveries'
import type { AdminOrder } from '@/services/orderService'
import * as deliveryService from '@/services/deliveryService'
import type { OrderStatus } from '@/types/enums'
import { formatPrice, formatDateTime } from '@/utils/format'

export default function AdminDeliveryPage() {
  const { deliveries, awaitingOrders, isLoading, error, refetch } =
    useAdminDeliveries()
  const [assigningOrder, setAssigningOrder] = useState<AdminOrder | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (deliveryId: string, status: OrderStatus) => {
    setIsUpdating(true)

    const result = await deliveryService.updateDeliveryStatus(deliveryId, status)

    setIsUpdating(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Delivery status updated')
    void refetch()
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Delivery</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Assign delivery partners and track active deliveries.
        </p>
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && (
        <>
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">
              Awaiting Assignment
            </h3>

            {awaitingOrders.length === 0 ? (
              <EmptyState
                title="No orders waiting"
                description="Orders ready for delivery will appear here."
              />
            ) : (
              <div className="overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-md">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-black/5 bg-background/60">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Order</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Total</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awaitingOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-black/5 last:border-b-0"
                      >
                        <td className="px-4 py-4 font-medium">
                          {order.order_number}
                        </td>
                        <td className="px-4 py-4">{order.customer_name}</td>
                        <td className="px-4 py-4 text-text-secondary">
                          {ORDER_STATUS[order.order_status]}
                        </td>
                        <td className="px-4 py-4">{formatPrice(order.total)}</td>
                        <td className="px-4 py-4 text-text-secondary">
                          {formatDateTime(new Date(order.created_at))}
                        </td>
                        <td className="px-4 py-4">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setAssigningOrder(order)}
                          >
                            Assign
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">
              Active Deliveries
            </h3>

            {deliveries.length === 0 ? (
              <EmptyState
                title="No active deliveries"
                description="Assigned deliveries will appear here."
              />
            ) : (
              <DeliveryTable
                deliveries={deliveries}
                onStatusChange={handleStatusChange}
                isUpdating={isUpdating}
              />
            )}
          </section>
        </>
      )}

      <AssignDeliveryModal
        order={assigningOrder}
        onClose={() => setAssigningOrder(null)}
        onSuccess={() => {
          setAssigningOrder(null)
          void refetch()
        }}
      />
    </div>
  )
}
