import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { OrderDetailsPanel } from '@/components/orders/OrderDetailsPanel'
import { OrderTracking } from '@/components/orders/OrderTracking'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { Button } from '@/components/ui/Button'
import { Loader } from '@/components/ui/Loader'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { ORDER_STATUS, ORDER_STATUS_LIST } from '@/constants/ORDER_STATUS'
import * as orderService from '@/services/orderService'
import type { OrderFullDetails } from '@/types/Order'
import type { OrderStatus } from '@/types/enums'

interface AdminOrderDetailModalProps {
  orderId: string | null
  onClose: () => void
  onStatusUpdated: () => void
}

export function AdminOrderDetailModal({
  orderId,
  onClose,
  onStatusUpdated,
}: AdminOrderDetailModalProps) {
  const [order, setOrder] = useState<OrderFullDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<OrderStatus>('pending')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!orderId) {
      setOrder(null)
      return
    }

    const loadOrder = async () => {
      setIsLoading(true)

      const result = await orderService.getAdminOrderDetails(orderId)

      if (result.success) {
        setOrder(result.data)
        setStatus(result.data.order_status)
      } else {
        toast.error(result.message)
        onClose()
      }

      setIsLoading(false)
    }

    void loadOrder()
  }, [orderId, onClose])

  const handleUpdateStatus = async () => {
    if (!order) return

    setIsUpdating(true)

    const result = await orderService.updateOrderStatus(order.id, status)

    setIsUpdating(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Order status updated')
    onStatusUpdated()
    onClose()
  }

  const statusOptions = ORDER_STATUS_LIST.map((value) => ({
    label: ORDER_STATUS[value],
    value,
  }))

  return (
    <Modal
      isOpen={Boolean(orderId)}
      onClose={onClose}
      title={order ? `Order ${order.order_number}` : 'Order Details'}
      className="max-w-3xl"
    >
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      )}

      {!isLoading && order && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <OrderStatusBadge status={order.order_status} />
            <Select
              label="Update Status"
              options={statusOptions}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as OrderStatus)
              }
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-[var(--radius-card)] bg-background p-4">
              <h3 className="font-semibold text-text-primary">Tracking</h3>
              <div className="mt-4">
                <OrderTracking status={order.order_status} />
              </div>
            </section>

            <section className="max-h-80 overflow-y-auto">
              <OrderDetailsPanel order={order} />
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              disabled={isUpdating || status === order.order_status}
              onClick={() => void handleUpdateStatus()}
            >
              {isUpdating ? 'Updating...' : 'Save Status'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
