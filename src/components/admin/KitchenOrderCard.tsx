import { useEffect, useState } from 'react'
import { Eye, Phone, User } from 'lucide-react'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { Button } from '@/components/ui/Button'
import { PAYMENT_METHOD } from '@/constants/PAYMENT_METHOD'
import type { AdminOrder } from '@/services/orderService'
import type { OrderStatus } from '@/types/enums'
import { cn } from '@/utils/cn'
import { formatPrice } from '@/utils/format'

function formatElapsed(iso: string, nowMs: number): string {
  const seconds = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ago`
}

export type KitchenPrimaryAction =
  | 'accept'
  | 'reject'
  | 'start_preparing'
  | 'mark_ready'
  | 'assign_delivery'
  | 'mark_delivered'

interface KitchenOrderCardProps {
  order: AdminOrder
  accent?: 'new' | 'default'
  isUpdating?: boolean
  onView?: (orderId: string) => void
  onAccept?: (order: AdminOrder) => void
  onReject?: (order: AdminOrder) => void
  onPrimaryAction?: (order: AdminOrder, action: KitchenPrimaryAction) => void
}

function getNextAction(
  status: OrderStatus,
): { action: KitchenPrimaryAction; label: string; variant: 'primary' | 'success' } | null {
  switch (status) {
    case 'confirmed':
      return {
        action: 'start_preparing',
        label: 'Start Preparing',
        variant: 'primary',
      }
    case 'preparing':
      return { action: 'mark_ready', label: 'Mark Ready', variant: 'success' }
    case 'ready':
      return {
        action: 'assign_delivery',
        label: 'Assign Delivery',
        variant: 'primary',
      }
    case 'out_for_delivery':
      return {
        action: 'mark_delivered',
        label: 'Mark Delivered',
        variant: 'success',
      }
    default:
      return null
  }
}

export function KitchenOrderCard({
  order,
  accent = 'default',
  isUpdating = false,
  onView,
  onAccept,
  onReject,
  onPrimaryAction,
}: KitchenOrderCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const isNew = order.order_status === 'pending' || accent === 'new'
  const next = getNextAction(order.order_status)

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1_000)
    return () => window.clearInterval(id)
  }, [])

  const itemsSummary =
    order.items.length > 0
      ? order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')
      : 'No items listed'

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-[var(--radius-card)] border bg-surface p-4 shadow-sm',
        isNew
          ? 'border-[#FC8019] ring-2 ring-[#FC8019]/25'
          : 'border-black/8',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-lg font-bold text-text-primary">
            {order.order_number}
          </p>
          <p
            className={cn(
              'mt-0.5 text-sm font-semibold',
              isNew ? 'text-[#FC8019]' : 'text-text-secondary',
            )}
          >
            {formatElapsed(order.created_at, nowMs)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <OrderStatusBadge status={order.order_status} />
          {onView && (
            <button
              type="button"
              onClick={() => onView(order.id)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label={`View ${order.order_number}`}
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <p className="line-clamp-3 text-sm leading-relaxed text-text-primary">
        {itemsSummary}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-bold text-text-primary">
          {formatPrice(order.total)}
        </span>
        <span className="text-text-secondary">
          {PAYMENT_METHOD[order.payment_method]}
        </span>
      </div>

      <div className="space-y-1 text-sm text-text-secondary">
        <p className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate text-text-primary">{order.customer_name}</span>
        </p>
        {order.customer_phone && (
          <p className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {order.customer_phone}
          </p>
        )}
        {order.order_status === 'out_for_delivery' && order.delivery_partner && (
          <p className="rounded-md bg-background px-2 py-1.5 text-xs">
            Rider: <span className="font-medium text-text-primary">{order.delivery_partner}</span>
            {order.partner_phone ? ` · ${order.partner_phone}` : ''}
          </p>
        )}
        {order.special_instructions && (
          <p className="rounded-md bg-warning/15 px-2 py-1.5 text-xs text-text-primary">
            Note: {order.special_instructions}
          </p>
        )}
      </div>

      {isNew && onAccept && onReject ? (
        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant="danger"
            size="lg"
            className="min-h-12"
            disabled={isUpdating}
            onClick={() => onReject(order)}
          >
            Reject
          </Button>
          <Button
            type="button"
            variant="success"
            size="lg"
            className="min-h-12"
            disabled={isUpdating}
            onClick={() => onAccept(order)}
          >
            Accept
          </Button>
        </div>
      ) : next && onPrimaryAction ? (
        <div className="mt-auto pt-1">
          <Button
            type="button"
            variant={next.variant}
            size="lg"
            fullWidth
            className="min-h-12"
            disabled={isUpdating}
            onClick={() => onPrimaryAction(order, next.action)}
          >
            {next.label}
          </Button>
        </div>
      ) : null}
    </article>
  )
}
