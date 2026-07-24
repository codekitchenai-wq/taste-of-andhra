import { useMemo, useState } from 'react'
import {
  KitchenOrderCard,
  type KitchenPrimaryAction,
} from '@/components/admin/KitchenOrderCard'
import type { AdminOrder } from '@/services/orderService'
import type { OrderStatus } from '@/types/enums'
import { cn } from '@/utils/cn'

type BoardColumnId =
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'

interface ColumnConfig {
  id: BoardColumnId
  title: string
  statuses: OrderStatus[]
  headerClass: string
}

const STAGE_COLUMNS: ColumnConfig[] = [
  {
    id: 'confirmed',
    title: 'Confirmed',
    statuses: ['confirmed'],
    headerClass: 'bg-secondary/15 text-secondary',
  },
  {
    id: 'preparing',
    title: 'Preparing',
    statuses: ['preparing'],
    headerClass: 'bg-primary/10 text-primary',
  },
  {
    id: 'ready',
    title: 'Ready',
    statuses: ['ready'],
    headerClass: 'bg-success/15 text-success',
  },
  {
    id: 'out_for_delivery',
    title: 'Out for Delivery',
    statuses: ['out_for_delivery'],
    headerClass: 'bg-accent/25 text-text-primary',
  },
]

interface KitchenOrderBoardProps {
  orders: AdminOrder[]
  updatingOrderId?: string | null
  onView: (orderId: string) => void
  onAccept: (order: AdminOrder) => void
  onReject: (order: AdminOrder) => void
  onPrimaryAction: (order: AdminOrder, action: KitchenPrimaryAction) => void
}

export function KitchenOrderBoard({
  orders,
  updatingOrderId = null,
  onView,
  onAccept,
  onReject,
  onPrimaryAction,
}: KitchenOrderBoardProps) {
  const [showDelivered, setShowDelivered] = useState(false)

  const { pending, byColumn, delivered, cancelled } = useMemo(() => {
    const pendingOrders = orders
      .filter((order) => order.order_status === 'pending')
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )

    const columns: Record<BoardColumnId, AdminOrder[]> = {
      confirmed: [],
      preparing: [],
      ready: [],
      out_for_delivery: [],
    }

    for (const order of orders) {
      const column = STAGE_COLUMNS.find((col) =>
        col.statuses.includes(order.order_status),
      )
      if (column) {
        columns[column.id].push(order)
      }
    }

    for (const key of Object.keys(columns) as BoardColumnId[]) {
      columns[key].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
    }

    const deliveredOrders = orders
      .filter((order) => order.order_status === 'delivered')
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

    const cancelledOrders = orders
      .filter((order) => order.order_status === 'cancelled')
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

    return {
      pending: pendingOrders,
      byColumn: columns,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
    }
  }, [orders])

  const hasStageOrders = STAGE_COLUMNS.some(
    (column) => byColumn[column.id].length > 0,
  )
  const cancelledOnly =
    cancelled.length > 0 &&
    orders.every((order) => order.order_status === 'cancelled')
  const deliveredOnly =
    delivered.length > 0 &&
    orders.every((order) => order.order_status === 'delivered')

  return (
    <div className="space-y-6">
      {!cancelledOnly && !deliveredOnly && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="font-heading text-xl font-bold text-text-primary">
              New Orders
            </h3>
            <span
              className={cn(
                'inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-sm font-bold text-white',
                pending.length > 0
                  ? 'animate-pulse bg-[#FC8019]'
                  : 'bg-text-secondary/40',
              )}
            >
              {pending.length}
            </span>
          </div>

          {pending.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-black/15 bg-surface/60 px-4 py-8 text-center text-sm text-text-secondary">
              No new orders waiting — you&apos;re all caught up.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pending.map((order) => (
                <KitchenOrderCard
                  key={order.id}
                  order={order}
                  accent="new"
                  isUpdating={updatingOrderId === order.id}
                  onView={onView}
                  onAccept={onAccept}
                  onReject={onReject}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {hasStageOrders && (
        <section className="space-y-3">
          <h3 className="font-heading text-xl font-bold text-text-primary">
            Kitchen Board
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {STAGE_COLUMNS.map((column) => {
              const columnOrders = byColumn[column.id]
              return (
                <div
                  key={column.id}
                  className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-[var(--radius-card)] bg-background/80"
                >
                  <div
                    className={cn(
                      'flex items-center justify-between rounded-t-[var(--radius-card)] px-3 py-2.5',
                      column.headerClass,
                    )}
                  >
                    <h4 className="text-sm font-bold uppercase tracking-wide">
                      {column.title}
                    </h4>
                    <span className="rounded-full bg-surface/80 px-2 py-0.5 text-xs font-bold">
                      {columnOrders.length}
                    </span>
                  </div>
                  <div className="flex max-h-[min(70vh,720px)] flex-col gap-3 overflow-y-auto p-2">
                    {columnOrders.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-text-secondary">
                        Empty
                      </p>
                    ) : (
                      columnOrders.map((order) => (
                        <KitchenOrderCard
                          key={order.id}
                          order={order}
                          isUpdating={updatingOrderId === order.id}
                          onView={onView}
                          onPrimaryAction={onPrimaryAction}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {delivered.length > 0 && (
        <section className="space-y-3">
          {deliveredOnly ? (
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Delivered ({delivered.length})
            </h3>
          ) : (
            <button
              type="button"
              onClick={() => setShowDelivered((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-[var(--radius-card)] bg-surface px-4 py-3 text-left shadow-sm"
            >
              <span className="font-heading text-lg font-bold text-text-primary">
                Delivered
              </span>
              <span className="text-sm text-text-secondary">
                {delivered.length} · {showDelivered ? 'Hide' : 'Show'}
              </span>
            </button>
          )}
          {(showDelivered || deliveredOnly) && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {delivered.slice(0, 12).map((order) => (
                <KitchenOrderCard
                  key={order.id}
                  order={order}
                  onView={onView}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {cancelledOnly && (
        <section className="space-y-3">
          <h3 className="font-heading text-lg font-bold text-text-secondary">
            Cancelled ({cancelled.length})
          </h3>
          <div className="grid gap-4 opacity-80 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {cancelled.slice(0, 24).map((order) => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                onView={onView}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
