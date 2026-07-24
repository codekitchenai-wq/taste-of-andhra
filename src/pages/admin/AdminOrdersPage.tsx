import { useMemo, useRef, useState } from 'react'
import { LayoutGrid, List, Search, Volume2, VolumeX } from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminOrderDetailModal } from '@/components/admin/AdminOrderDetailModal'
import { AssignDeliveryModal } from '@/components/admin/AssignDeliveryModal'
import { KitchenOrderBoard } from '@/components/admin/KitchenOrderBoard'
import type { KitchenPrimaryAction } from '@/components/admin/KitchenOrderCard'
import { NewOrderAlert } from '@/components/admin/NewOrderAlert'
import { OrderTable } from '@/components/admin/OrderTable'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { Select } from '@/components/ui/Select'
import { ORDER_STATUS, ORDER_STATUS_LIST } from '@/constants/ORDER_STATUS'
import { useAdminOrders } from '@/hooks/useAdminOrders'
import { useNewOrderAlerts } from '@/hooks/useNewOrderAlerts'
import * as orderService from '@/services/orderService'
import type { AdminOrder } from '@/services/orderService'
import type { OrderStatus } from '@/types/enums'
import { cn } from '@/utils/cn'

type ViewMode = 'board' | 'list'

const STATUS_BY_ACTION: Partial<Record<KitchenPrimaryAction, OrderStatus>> = {
  accept: 'confirmed',
  reject: 'cancelled',
  start_preparing: 'preparing',
  mark_ready: 'ready',
  mark_delivered: 'delivered',
}

export default function AdminOrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null)
  const [assigningOrder, setAssigningOrder] = useState<AdminOrder | null>(null)
  const newOrdersRef = useRef<HTMLDivElement>(null)

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status:
        viewMode === 'list' && statusFilter ? statusFilter : undefined,
    }),
    [search, statusFilter, viewMode],
  )

  const { orders, isLoading, error, refetch } = useAdminOrders(filters)
  const {
    alertingOrders,
    isMuted,
    toggleMute,
    dismissAlert,
  } = useNewOrderAlerts(orders)

  const boardOrders = useMemo(() => {
    if (!statusFilter || viewMode !== 'board') return orders
    return orders.filter((order) => order.order_status === statusFilter)
  }, [orders, statusFilter, viewMode])

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
      // Keep board live; silent refetch comes from realtime/poll
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

  const statusOptions = [
    { label: 'All statuses', value: '' },
    ...ORDER_STATUS_LIST.map((status) => ({
      label: ORDER_STATUS[status],
      value: status,
    })),
  ]

  const visibleOrders = viewMode === 'board' ? boardOrders : orders
  const showEmpty =
    !isLoading && !error && visibleOrders.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Orders</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Kitchen board for accepting and progressing live orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute new order sound' : 'Mute new order sound'}
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
                'inline-flex items-center gap-1.5 rounded-[calc(var(--radius-button)-2px)] px-3 py-2 text-sm font-medium transition-colors',
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
                'inline-flex items-center gap-1.5 rounded-[calc(var(--radius-button)-2px)] px-3 py-2 text-sm font-medium transition-colors',
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

      <NewOrderAlert
        orders={alertingOrders}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onAccept={handleAccept}
        onDismiss={dismissAlert}
        onViewAll={() => {
          setViewMode('board')
          setStatusFilter('pending')
          newOrdersRef.current?.scrollIntoView({ behavior: 'smooth' })
        }}
      />

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            placeholder="Search by order number..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
            aria-label="Search orders"
          />
        </div>
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as OrderStatus | '')
          }
          className="md:w-56"
        />
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {showEmpty && (
        <EmptyState
          title="No orders found"
          description="Try adjusting your search or filters."
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
          />
        </div>
      )}

      {!isLoading && !error && visibleOrders.length > 0 && viewMode === 'list' && (
        <OrderTable
          orders={orders}
          isUpdating={Boolean(updatingOrderId)}
          onView={setViewingOrderId}
          onStatusChange={(orderId, status) =>
            void handleStatusChange(orderId, status)
          }
        />
      )}

      <AdminOrderDetailModal
        orderId={viewingOrderId}
        onClose={() => setViewingOrderId(null)}
        onStatusUpdated={() => void refetch({ silent: true })}
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
