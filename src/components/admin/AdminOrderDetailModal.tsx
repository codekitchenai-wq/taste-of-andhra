import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { OrderDetailsPanel } from '@/components/orders/OrderDetailsPanel'
import { OrderEtaBanner } from '@/components/orders/OrderEtaBanner'
import { OrderEtaControls } from '@/components/orders/OrderEtaControls'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
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
  const onCloseRef = useRef(onClose)
  const requestIdRef = useRef(0)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!orderId) {
      setOrder(null)
      setIsLoading(false)
      return
    }

    const requestId = ++requestIdRef.current
    let cancelled = false

    const loadOrder = async () => {
      // Keep previous content visible when switching orders; only show a loader
      // overlay so the modal does not collapse and flicker.
      setIsLoading(true)

      const result = await orderService.getAdminOrderDetails(orderId)
      if (cancelled || requestId !== requestIdRef.current) return

      if (result.success) {
        setOrder(result.data)
        setStatus(result.data.order_status)
      } else {
        toast.error(result.message)
        onCloseRef.current()
      }

      setIsLoading(false)
    }

    void loadOrder()
    return () => {
      cancelled = true
    }
  }, [orderId])

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
      title={
        order ? (
          <span className="inline-flex items-baseline gap-1 text-base">
            Order <OrderNumberDisplay value={order.order_number} />
          </span>
        ) : (
          'Order Details'
        )
      }
      className="max-w-lg sm:max-w-xl"
      footer={
        order ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPrinting || isLoading}
              onClick={() => void handlePrintTickets()}
            >
              {isPrinting ? 'Printing…' : 'Print Bill + KOT'}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={
                  isUpdating ||
                  isLoading ||
                  status === order.order_status ||
                  nextStatuses.length === 0
                }
                onClick={() => void handleUpdateStatus()}
              >
                {isUpdating ? 'Updating...' : 'Save Status'}
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      <div className="relative min-h-[12rem]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/70">
            <Loader />
          </div>
        )}

        {order && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.order_status} />
              {order.order_source === 'phone' && (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  Phone / Counter
                </span>
              )}
              {order.fulfillment_type === 'pickup' && (
                <span className="rounded-md bg-background px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                  Pickup
                </span>
              )}
            </div>

            <Select
              label="Update Status"
              options={statusOptions}
              value={status}
              disabled={nextStatuses.length === 0 || isLoading}
              onChange={(event) =>
                setStatus(event.target.value as OrderStatus)
              }
            />

            <OrderEtaBanner
              estimatedDelivery={order.estimated_delivery}
              orderStatus={order.order_status}
              variant="badge"
            />

            <OrderEtaControls
              compact
              orderStatus={order.order_status}
              isUpdating={isUpdating}
              onBump={(minutes) => void handleBumpEta(minutes)}
              onSetMinutesFromNow={(minutes) =>
                void handleSetEtaMinutes(minutes)
              }
            />

            <OrderDetailsPanel
              order={order}
              compact
              onOrderUpdated={(next) => {
                setOrder(next)
                onStatusUpdated()
              }}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
