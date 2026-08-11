import { useEffect, useMemo, useState } from 'react'
import {
  KitchenOrderCard,
  type KitchenPrimaryAction,
} from '@/components/admin/KitchenOrderCard'
import type { AdminOrder } from '@/services/orderService'
import type { OrderStatus } from '@/types/enums'
import { cn } from '@/utils/cn'
import { isOrderDelayed } from '@/utils/orderEta'

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
  onBumpEta?: (order: AdminOrder, minutes: number) => void
  onSetEtaMinutes?: (order: AdminOrder, minutes: number) => void
}

export function KitchenOrderBoard({
  orders,
  updatingOrderId = null,
  onView,
  onAccept,
  onReject,
  onPrimaryAction,
  onBumpEta,
  onSetEtaMinutes,
}: KitchenOrderBoardProps) {
  const [showDelivered, setShowDelivered] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const { pending, byColumn, delivered, cancelled, delayed } = useMemo(() => {
    const sortByEtaThenCreated = (list: AdminOrder[]) =>
      [...list].sort((a, b) => {
        const aDelayed = isOrderDelayed(a, nowMs)
        const bDelayed = isOrderDelayed(b, nowMs)
        if (aDelayed !== bDelayed) return aDelayed ? -1 : 1

        const aEta = a.estimated_delivery
          ? new Date(a.estimated_delivery).getTime()
          : Number.POSITIVE_INFINITY
        const bEta = b.estimated_delivery
          ? new Date(b.estimated_delivery).getTime()
          : Number.POSITIVE_INFINITY
        if (aEta !== bEta) return aEta - bEta

        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

    const delayedIds = new Set(
      orders.filter((order) => isOrderDelayed(order, nowMs)).map((o) => o.id),
    )

    const pendingOrders = sortByEtaThenCreated(
      orders.filter(
        (order) =>
          order.order_status === 'pending' && !delayedIds.has(order.id),
      ),
    )

    const columns: Record<BoardColumnId, AdminOrder[]> = {
      confirmed: [],
      preparing: [],
      ready: [],
      out_for_delivery: [],
    }

    for (const order of orders) {
      if (delayedIds.has(order.id)) continue
      const column = STAGE_COLUMNS.find((col) =>
        col.statuses.includes(order.order_status),
      )
      if (column) {
        columns[column.id].push(order)
      }
    }

    for (const key of Object.keys(columns) as BoardColumnId[]) {
      columns[key] = sortByEtaThenCreated(columns[key])
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

    const delayedOrders = sortByEtaThenCreated(
      orders.filter((order) => isOrderDelayed(order, nowMs)),
    )

    return {
      pending: pendingOrders,
      byColumn: columns,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
      delayed: delayedOrders,
    }
  }, [orders, nowMs])

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
    <div className="space-y-4">
      {delayed.length > 0 && !cancelledOnly && !deliveredOnly && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base font-bold text-error">
              Delayed
            </h3>
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-error px-1.5 py-0.5 text-xs font-bold text-white">
              {delayed.length}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {delayed.map((order) => (
              <KitchenOrderCard
                key={`delayed-${order.id}`}
                order={order}
                isUpdating={updatingOrderId === order.id}
                onView={onView}
                onAccept={onAccept}
                onReject={onReject}
                onPrimaryAction={onPrimaryAction}
                onBumpEta={onBumpEta}
                onSetEtaMinutes={onSetEtaMinutes}
              />
            ))}
          </div>
        </section>
      )}

      {!cancelledOnly && !deliveredOnly && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base font-bold text-text-primary">
              New Orders
            </h3>
            <span
              className={cn(
                'inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold text-white',
                pending.length > 0
                  ? 'animate-pulse bg-[#FC8019]'
                  : 'bg-text-secondary/40',
              )}
            >
              {pending.length}
            </span>
          </div>

          {pending.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-black/15 bg-surface/60 px-3 py-4 text-center text-xs text-text-secondary">
              No new orders waiting — you&apos;re all caught up.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {pending.map((order) => (
                <KitchenOrderCard
                  key={order.id}
                  order={order}
                  accent="new"
                  isUpdating={updatingOrderId === order.id}
                  onView={onView}
                  onAccept={onAccept}
                  onReject={onReject}
                  onBumpEta={onBumpEta}
                  onSetEtaMinutes={onSetEtaMinutes}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {hasStageOrders && (
        <section className="space-y-2">
          <h3 className="font-heading text-base font-bold text-text-primary">
            Kitchen Board
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STAGE_COLUMNS.map((column) => {
              const columnOrders = byColumn[column.id]
              return (
                <div
                  key={column.id}
                  className="flex w-[min(100%,240px)] shrink-0 flex-col rounded-[var(--radius-card)] bg-background/80"
                >
                  <div
                    className={cn(
                      'flex items-center justify-between rounded-t-[var(--radius-card)] px-2.5 py-1.5',
                      column.headerClass,
                    )}
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wide">
                      {column.title}
                    </h4>
                    <span className="rounded-full bg-surface/80 px-1.5 py-0.5 text-[10px] font-bold">
                      {columnOrders.length}
                    </span>
                  </div>
                  <div className="flex max-h-[min(75vh,780px)] flex-col gap-2 overflow-y-auto p-1.5">
                    {columnOrders.length === 0 ? (
                      <p className="px-2 py-4 text-center text-[10px] text-text-secondary">
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
                          onBumpEta={onBumpEta}
                          onSetEtaMinutes={onSetEtaMinutes}
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
        <section className="space-y-2">
          {deliveredOnly ? (
            <h3 className="font-heading text-sm font-bold text-text-primary">
              Delivered ({delivered.length})
            </h3>
          ) : (
            <button
              type="button"
              onClick={() => setShowDelivered((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-[var(--radius-card)] bg-surface px-3 py-2 text-left shadow-sm"
            >
              <span className="font-heading text-sm font-bold text-text-primary">
                Delivered
              </span>
              <span className="text-xs text-text-secondary">
                {delivered.length} · {showDelivered ? 'Hide' : 'Show'}
              </span>
            </button>
          )}
          {(showDelivered || deliveredOnly) && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
        <section className="space-y-2">
          <h3 className="font-heading text-sm font-bold text-text-secondary">
            Cancelled ({cancelled.length})
          </h3>
          <div className="grid gap-2 opacity-80 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
