import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { OrderDetailsPanel } from '@/components/orders/OrderDetailsPanel'
import { OrderEtaBanner } from '@/components/orders/OrderEtaBanner'
import { OrderEtaControls } from '@/components/orders/OrderEtaControls'
import { OrderTracking } from '@/components/orders/OrderTracking'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { Button } from '@/components/ui/Button'
import { Loader } from '@/components/ui/Loader'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import * as orderService from '@/services/orderService'
import * as printerService from '@/services/printerService'
import type { OrderFullDetails } from '@/types/Order'
import type { OrderStatus } from '@/types/enums'
import { getAllowedNextStatuses } from '@/utils/orderStatusTransitions'

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
  const [isPrinting, setIsPrinting] = useState(false)

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

  const handleBumpEta = async (minutes: number) => {
    if (!order) return
    setIsUpdating(true)
    const result = await orderService.bumpEstimatedDelivery(order.id, minutes)
    setIsUpdating(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setOrder({ ...order, estimated_delivery: result.data.estimated_delivery })
    toast.success(`Added ${minutes} minutes to ETA`)
    onStatusUpdated()
  }

  const handleSetEtaMinutes = async (minutes: number) => {
    if (!order) return
    setIsUpdating(true)
    const result = await orderService.setEstimatedDeliveryMinutesFromNow(
      order.id,
      minutes,
    )
    setIsUpdating(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setOrder({ ...order, estimated_delivery: result.data.estimated_delivery })
    toast.success(`ETA set to ${minutes} minutes from now`)
    onStatusUpdated()
  }

  const handlePrintTickets = async () => {
    if (!order) return
    setIsPrinting(true)
    const result = await printerService.printOrderTickets(order, {
      manual: true,
    })
    setIsPrinting(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    if (result.data.printed.length) {
      const labels = result.data.printed.map((type) =>
        type === 'kitchen' ? 'KOT' : 'Bill',
      )
      toast.success(`Printed ${labels.join(' + ')}`)
    } else {
      toast.error('No printers enabled. Turn them on in Admin → Settings.')
    }

    if (result.data.errors.length) {
      toast.error(result.data.errors.join(' · '))
    }
  }

  const nextStatuses = order
    ? getAllowedNextStatuses(order.order_status, order.fulfillment_type)
    : []
  const statusOptions = order
    ? [order.order_status, ...nextStatuses].map((value) => ({
        label:
          order.fulfillment_type === 'pickup' && value === 'delivered'
            ? 'Picked Up'
            : ORDER_STATUS[value],
        value,
      }))
    : []

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
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.order_status} />
              {order.order_source === 'phone' && (
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  Phone order
                </span>
              )}
              {order.fulfillment_type === 'pickup' && (
                <span className="rounded-md bg-background px-2 py-1 text-xs font-medium text-text-secondary">
                  Pickup
                </span>
              )}
            </div>
            <Select
              label="Update Status"
              options={statusOptions}
              value={status}
              disabled={nextStatuses.length === 0}
              onChange={(event) =>
                setStatus(event.target.value as OrderStatus)
              }
            />
          </div>

          <OrderEtaBanner
            estimatedDelivery={order.estimated_delivery}
            orderStatus={order.order_status}
          />

          <OrderEtaControls
            orderStatus={order.order_status}
            isUpdating={isUpdating}
            onBump={(minutes) => void handleBumpEta(minutes)}
            onSetMinutesFromNow={(minutes) => void handleSetEtaMinutes(minutes)}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-[var(--radius-card)] bg-background p-4">
              <h3 className="font-semibold text-text-primary">Tracking</h3>
              <div className="mt-4">
                <OrderTracking status={order.order_status} />
              </div>
            </section>

            <section className="max-h-80 overflow-y-auto">
              <OrderDetailsPanel
                order={order}
                onOrderUpdated={(next) => {
                  setOrder(next)
                  onStatusUpdated()
                }}
              />
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              disabled={isPrinting}
              onClick={() => void handlePrintTickets()}
            >
              {isPrinting ? 'Printing…' : 'Print Bill + KOT'}
            </Button>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button
                type="button"
                disabled={
                  isUpdating ||
                  status === order.order_status ||
                  nextStatuses.length === 0
                }
                onClick={() => void handleUpdateStatus()}
              >
                {isUpdating ? 'Updating...' : 'Save Status'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
