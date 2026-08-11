import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AssignDeliveryModal } from '@/components/admin/AssignDeliveryModal'
import { DeliveryTable } from '@/components/admin/DeliveryTable'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import { ROUTES } from '@/constants/ROUTES'
import { useAdminDeliveries } from '@/hooks/useAdminDeliveries'
import type { AdminOrder } from '@/services/orderService'
import * as deliveryQuoteService from '@/services/deliveryQuoteService'
import * as deliveryService from '@/services/deliveryService'
import * as deliverySettingsService from '@/services/deliverySettingsService'
import type { OrderStatus } from '@/types/enums'
import { formatPrice, formatDateTime } from '@/utils/format'

export default function AdminDeliveryPage() {
  const { deliveries, awaitingOrders, isLoading, error, refetch } =
    useAdminDeliveries()
  const [assigningOrder, setAssigningOrder] = useState<AdminOrder | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isPidgeEnabled, setIsPidgeEnabled] = useState(false)
  const [dispatchingOrderId, setDispatchingOrderId] = useState<string | null>(
    null,
  )

  useEffect(() => {
    void deliverySettingsService.getDeliverySettings().then((result) => {
      if (!result.success) return
      setIsPidgeEnabled(
        result.data.is_enabled && result.data.provider === 'pidge',
      )
    })
  }, [])

  // Riders are booked only once food is ready, otherwise the partner waits out
  // the whole cook time at the counter.
  const handleDispatchToPidge = async (order: AdminOrder) => {
    if (order.order_status !== 'ready') {
      toast.error('Mark the order ready before booking a Pidge rider.')
      return
    }

    setDispatchingOrderId(order.id)
    const result = await deliveryQuoteService.dispatchToPidge(order.id)
    setDispatchingOrderId(null)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Pidge rider requested')
    void refetch()
  }

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
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          to={ROUTES.ADMIN.SETTINGS}
          className="text-sm font-medium text-primary hover:text-primary-dark"
        >
          Delivery fees &amp; service area →
        </Link>
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
                description="Only Ready orders without a partner appear here."
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
                          <OrderNumberDisplay value={order.order_number} />
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
                          <div className="flex flex-wrap gap-2">
                            {isPidgeEnabled && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={
                                  dispatchingOrderId === order.id ||
                                  order.order_status !== 'ready'
                                }
                                title={
                                  order.order_status === 'ready'
                                    ? 'Book a Pidge rider now'
                                    : 'Available once the kitchen marks this ready'
                                }
                                onClick={() =>
                                  void handleDispatchToPidge(order)
                                }
                              >
                                {dispatchingOrderId === order.id
                                  ? 'Booking...'
                                  : 'Book Pidge'}
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant={isPidgeEnabled ? 'secondary' : 'primary'}
                              onClick={() => setAssigningOrder(order)}
                            >
                              {isPidgeEnabled ? 'Own partner' : 'Assign'}
                            </Button>
                          </div>
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
