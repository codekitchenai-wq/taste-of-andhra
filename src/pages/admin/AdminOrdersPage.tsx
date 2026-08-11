import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayoutGrid, List, Volume2, VolumeX } from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminOrderDetailModal } from '@/components/admin/AdminOrderDetailModal'
import { AssignDeliveryModal } from '@/components/admin/AssignDeliveryModal'
import { KitchenOrderBoard } from '@/components/admin/KitchenOrderBoard'
import type { KitchenPrimaryAction } from '@/components/admin/KitchenOrderCard'
import { NewOrderAlert } from '@/components/admin/NewOrderAlert'
import {
  OrderStatusFilterButtons,
  type OrderViewFilter,
} from '@/components/admin/OrderStatusFilterButtons'
import { OrderTable } from '@/components/admin/OrderTable'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ORDER_STATUS_LIST } from '@/constants/ORDER_STATUS'
import { useAdminOrders } from '@/hooks/useAdminOrders'
import { useAutoPrintOrders } from '@/hooks/useAutoPrintOrders'
import { useNewOrderAlerts } from '@/hooks/useNewOrderAlerts'
import * as orderService from '@/services/orderService'
import type { AdminOrder } from '@/services/orderService'
import type { OrderStatus } from '@/types/enums'
import { cn } from '@/utils/cn'
import {
  createDashboardRange,
  endOfLocalDayIso,
  startOfLocalDayIso,
  type DashboardRangePreset,
} from '@/utils/dateRange'
import { isOrderDelayed } from '@/utils/orderEta'
import { isActiveOrderStatus } from '@/utils/orderStatusStyles'

type ViewMode = 'board' | 'list'
type OrdersDatePreset = Extract<
  DashboardRangePreset,
  'today' | 'yesterday' | 'last7'
>

const STATUS_BY_ACTION: Partial<Record<KitchenPrimaryAction, OrderStatus>> = {
  accept: 'confirmed',
  reject: 'cancelled',
  start_preparing: 'preparing',
  mark_ready: 'ready',
  mark_out_for_delivery: 'out_for_delivery',
  mark_delivered: 'delivered',
}

const DATE_PRESETS: { id: OrdersDatePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last week' },
]

export default function AdminOrdersPage() {
  const [viewFilter, setViewFilter] = useState<OrderViewFilter>('active')
  const [datePreset, setDatePreset] = useState<OrdersDatePreset>('today')
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null)
  const [assigningOrder, setAssigningOrder] = useState<AdminOrder | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const newOrdersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const dateRange = useMemo(
    () => createDashboardRange(datePreset),
    [datePreset],
  )

  const filters = useMemo(
    () => ({
      createdFrom: startOfLocalDayIso(dateRange.fromDate),
      createdTo: endOfLocalDayIso(dateRange.toDate),
    }),
    [dateRange.fromDate, dateRange.toDate],
  )

  const { orders, isLoading, error, refetch } = useAdminOrders(filters)

  const handleCloseOrderView = useCallback(() => {
    setViewingOrderId(null)
  }, [])

  const handleOrderStatusUpdated = useCallback(() => {
    void refetch({ silent: true })
  }, [refetch])

  const {
    alertingOrders,
    isMuted,
    toggleMute,
    dismissAlert,
  } = useNewOrderAlerts(orders, !isLoading)
  useAutoPrintOrders(orders, !isLoading)

  const delayedCount = useMemo(
    () => orders.filter((order) => isOrderDelayed(order, nowMs)).length,
    [orders, nowMs],
  )

  const filterCounts = useMemo(() => {
    const counts = {
      active: orders.filter((order) => isActiveOrderStatus(order.order_status))
        .length,
      all: orders.length,
      delayed: delayedCount,
    } as Record<OrderViewFilter, number>

    for (const status of ORDER_STATUS_LIST) {
      counts[status] = orders.filter(
        (order) => order.order_status === status,
      ).length
    }

    return counts
  }, [orders, delayedCount])

  const boardOrders = useMemo(() => {
    let list = orders
    if (viewFilter === 'delayed') {
      list = list.filter((order) => isOrderDelayed(order, nowMs))
    } else if (viewFilter === 'active') {
      list = list.filter((order) => isActiveOrderStatus(order.order_status))
    } else if (viewFilter !== 'all') {
      list = list.filter((order) => order.order_status === viewFilter)
    }
    return list
  }, [orders, viewFilter, nowMs])

  const listOrders = useMemo(() => {
    if (viewFilter === 'delayed') {
      return orders.filter((order) => isOrderDelayed(order, nowMs))
    }
    if (viewFilter === 'active') {
      return orders.filter((order) => isActiveOrderStatus(order.order_status))
    }
    if (viewFilter !== 'all') {
      return orders.filter((order) => order.order_status === viewFilter)
    }
    return orders
  }, [orders, viewFilter, nowMs])

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setUpdatingOrderId(orderId)

    const result = await orderService.updateOrderStatus(orderId, status)

    setUpdatingOrderId(null)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    dismissAlert(orderId)
    if (status !== 'pending') {
      void refetch({ silent: true })
    }

    toast.success(
      status === 'confirmed'
        ? 'Order accepted'
        : status === 'cancelled'
          ? 'Order rejected'
          : 'Order status updated',
    )
  }

  const handleAccept = (order: AdminOrder) => {
    void handleStatusChange(order.id, 'confirmed')
  }

  const handleReject = (order: AdminOrder) => {
    const confirmed = window.confirm(
      `Reject / cancel order ${order.order_number}? This cannot be undone from the kitchen board.`,
    )
    if (!confirmed) return
    void handleStatusChange(order.id, 'cancelled')
  }

  const handlePrimaryAction = (
    order: AdminOrder,
    action: KitchenPrimaryAction,
  ) => {
    if (action === 'assign_delivery') {
      setAssigningOrder(order)
      return
    }

    if (action === 'reject') {
      handleReject(order)
      return
    }

    const status = STATUS_BY_ACTION[action]
    if (!status) return
    void handleStatusChange(order.id, status)
  }

  const handleBumpEta = async (order: AdminOrder, minutes: number) => {
    setUpdatingOrderId(order.id)
    const result = await orderService.bumpEstimatedDelivery(order.id, minutes)
    setUpdatingOrderId(null)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(`Added ${minutes} minutes to ETA`)
    void refetch({ silent: true })
  }

  const handleSetEtaMinutes = async (order: AdminOrder, minutes: number) => {
    setUpdatingOrderId(order.id)
    const result = await orderService.setEstimatedDeliveryMinutesFromNow(
      order.id,
      minutes,
    )
    setUpdatingOrderId(null)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(`ETA set to ${minutes} minutes from now`)
    void refetch({ silent: true })
  }

  const visibleOrders = viewMode === 'board' ? boardOrders : listOrders
  const showEmpty =
    !isLoading && !error && visibleOrders.length === 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex flex-wrap rounded-[var(--radius-button)] border border-black/10 bg-surface p-1"
          role="group"
          aria-label="Order date range"
        >
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDatePreset(preset.id)}
              className={cn(
                'rounded-[calc(var(--radius-button)-2px)] px-3 py-1.5 text-sm font-medium transition-colors',
                datePreset === preset.id
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-black/5',
              )}
              aria-pressed={datePreset === preset.id}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={toggleMute}
            aria-label={
              isMuted ? 'Unmute new order sound' : 'Mute new order sound'
            }
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>

          <div className="inline-flex rounded-[var(--radius-button)] border border-black/10 bg-surface p-1">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-[calc(var(--radius-button)-2px)] px-3 py-1.5 text-sm font-medium transition-colors',
                viewMode === 'board'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-black/5',
              )}
              aria-pressed={viewMode === 'board'}
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-[calc(var(--radius-button)-2px)] px-3 py-1.5 text-sm font-medium transition-colors',
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-black/5',
              )}
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
              List
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-text-secondary">
        Showing{' '}
        <span className="font-medium text-text-primary">{dateRange.label}</span>
        {viewFilter === 'active' ? ' · active orders only' : null}
      </p>

      <OrderStatusFilterButtons
        activeFilter={viewFilter}
        counts={filterCounts}
        onChange={setViewFilter}
      />

      <NewOrderAlert
        orders={alertingOrders}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onAccept={handleAccept}
        onDismiss={dismissAlert}
        onViewAll={() => {
          setViewMode('board')
          setDatePreset('today')
          setViewFilter('pending')
          newOrdersRef.current?.scrollIntoView({ behavior: 'smooth' })
        }}
      />

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {showEmpty && (
        <EmptyState
          title={
            viewFilter === 'delayed'
              ? 'No delayed orders'
              : viewFilter === 'pending'
                ? 'No new orders'
                : viewFilter === 'active'
                  ? 'No active orders'
                  : 'No orders found'
          }
          description={
            viewFilter === 'delayed'
              ? 'All active orders are within their delivery window.'
              : viewFilter === 'pending'
                ? 'You are all caught up — no new orders waiting.'
                : viewFilter === 'active'
                  ? `No open orders for ${dateRange.label.toLowerCase()}. Delivered and cancelled are hidden here.`
                  : `Nothing in ${dateRange.label.toLowerCase()} for this filter. Try another day range or status.`
          }
        />
      )}

      {!isLoading && !error && visibleOrders.length > 0 && viewMode === 'board' && (
        <div ref={newOrdersRef}>
          <KitchenOrderBoard
            orders={boardOrders}
            updatingOrderId={updatingOrderId}
            onView={setViewingOrderId}
            onAccept={handleAccept}
            onReject={handleReject}
            onPrimaryAction={handlePrimaryAction}
            onBumpEta={(order, minutes) => void handleBumpEta(order, minutes)}
            onSetEtaMinutes={(order, minutes) =>
              void handleSetEtaMinutes(order, minutes)
            }
          />
        </div>
      )}

      {!isLoading && !error && visibleOrders.length > 0 && viewMode === 'list' && (
        <OrderTable
          orders={listOrders}
          isUpdating={Boolean(updatingOrderId)}
          onView={setViewingOrderId}
          onStatusChange={(orderId, status) =>
            void handleStatusChange(orderId, status)
          }
        />
      )}

      <AdminOrderDetailModal
        orderId={viewingOrderId}
        onClose={handleCloseOrderView}
        onStatusUpdated={handleOrderStatusUpdated}
      />

      <AssignDeliveryModal
        order={assigningOrder}
        onClose={() => setAssigningOrder(null)}
        onSuccess={() => {
          setAssigningOrder(null)
          void refetch({ silent: true })
        }}
      />
    </div>
  )
}
