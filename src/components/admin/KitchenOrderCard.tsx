import { useEffect, useState } from 'react'
import { Eye, Phone, User } from 'lucide-react'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { OrderEtaBanner } from '@/components/orders/OrderEtaBanner'
import { OrderEtaControls } from '@/components/orders/OrderEtaControls'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { Button } from '@/components/ui/Button'
import { PAYMENT_METHOD } from '@/constants/PAYMENT_METHOD'
import type { AdminOrder } from '@/services/orderService'
import type { OrderStatus } from '@/types/enums'
import { cn } from '@/utils/cn'
import { formatPrice } from '@/utils/format'
import { isOrderDelayed, isTerminalOrderStatus } from '@/utils/orderEta'
import { ORDER_STATUS_SURFACE_STYLES } from '@/utils/orderStatusStyles'

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
  | 'mark_out_for_delivery'
  | 'mark_delivered'

interface KitchenOrderCardProps {
  order: AdminOrder
  accent?: 'new' | 'default'
  isUpdating?: boolean
  onView?: (orderId: string) => void
  onAccept?: (order: AdminOrder) => void
  onReject?: (order: AdminOrder) => void
  onPrimaryAction?: (order: AdminOrder, action: KitchenPrimaryAction) => void
  onBumpEta?: (order: AdminOrder, minutes: number) => void
  onSetEtaMinutes?: (order: AdminOrder, minutes: number) => void
}

function getNextAction(
  status: OrderStatus,
  hasDeliveryPartner: boolean,
  fulfillmentType: 'delivery' | 'pickup' = 'delivery',
): { action: KitchenPrimaryAction; label: string; variant: 'primary' | 'success' } | null {
  switch (status) {
    case 'confirmed':
      return {
        action: 'start_preparing',
        label: 'Start Prep',
        variant: 'primary',
      }
    case 'preparing':
      return { action: 'mark_ready', label: 'Ready', variant: 'success' }
    case 'ready':
      if (fulfillmentType === 'pickup') {
        return {
          action: 'mark_delivered',
          label: 'Picked Up',
          variant: 'success',
        }
      }
      if (hasDeliveryPartner) {
        return {
          action: 'mark_out_for_delivery',
          label: 'Out for Delivery',
          variant: 'primary',
        }
      }
      return {
        action: 'assign_delivery',
        label: 'Assign',
        variant: 'primary',
      }
    case 'out_for_delivery':
      return {
        action: 'mark_delivered',
        label: 'Delivered',
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
  onBumpEta,
  onSetEtaMinutes,
}: KitchenOrderCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const isNew = order.order_status === 'pending' || accent === 'new'
  const delayed = isOrderDelayed(order, nowMs)
  const next = getNextAction(
    order.order_status,
    Boolean(order.delivery_partner),
    order.fulfillment_type,
  )
  const canEditEta =
    Boolean(onBumpEta && onSetEtaMinutes) &&
    !isTerminalOrderStatus(order.order_status)

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
        'flex flex-col gap-1.5 rounded-[var(--radius-card)] border p-2.5 shadow-sm',
        delayed
          ? 'border-error/40 bg-error/5 ring-1 ring-error/20'
          : ORDER_STATUS_SURFACE_STYLES[order.order_status],
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <p className="truncate font-heading text-sm leading-tight text-text-primary">
            <OrderNumberDisplay value={order.order_number} />
          </p>
          <p
            className={cn(
              'text-xs font-semibold leading-tight',
              isNew ? 'text-[#1C1917]' : 'text-text-secondary',
            )}
          >
            {formatElapsed(order.created_at, nowMs)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <OrderStatusBadge status={order.order_status} />
          <button
            type="button"
            onClick={() => onView?.(order.id)}
            disabled={!onView}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary disabled:invisible"
            aria-label={`View ${order.order_number}`}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <OrderEtaBanner
          estimatedDelivery={order.estimated_delivery}
          orderStatus={order.order_status}
          variant="badge"
        />
        {order.order_source === 'phone' && (
          <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary">
            Phone
          </span>
        )}
        {order.fulfillment_type === 'pickup' && (
          <span className="rounded bg-background px-1 py-0.5 text-[10px] font-medium text-text-secondary">
            Pickup
          </span>
        )}
        {order.payment_status === 'pending' &&
          order.payment_method === 'pay_later' && (
            <span
              className={cn(
                'rounded px-1 py-0.5 text-[10px] font-medium',
                order.payment_claimed_at
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-warning/20 text-text-primary',
              )}
            >
              {order.payment_claimed_at ? 'UPI claimed' : 'UPI unpaid'}
            </span>
          )}
        {order.payment_status === 'paid' && (
          <span className="rounded bg-success/15 px-1 py-0.5 text-[10px] font-medium text-success">
            Paid
          </span>
        )}
      </div>

      {canEditEta && (
        <OrderEtaControls
          orderStatus={order.order_status}
          isUpdating={isUpdating}
          compact
          onBump={(minutes) => onBumpEta?.(order, minutes)}
          onSetMinutesFromNow={(minutes) => onSetEtaMinutes?.(order, minutes)}
        />
      )}

      <p className="line-clamp-2 text-xs leading-snug text-text-primary">
        {itemsSummary}
      </p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        <span className="font-bold text-text-primary">
          {formatPrice(order.total)}
        </span>
        <span className="text-text-secondary">
          {PAYMENT_METHOD[order.payment_method]}
        </span>
      </div>

      <div className="space-y-0.5 text-xs text-text-secondary">
        <p className="flex min-w-0 items-center gap-1">
          <User className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate text-text-primary">{order.customer_name}</span>
          {order.customer_phone ? (
            <>
              <span className="text-text-secondary/50">·</span>
              <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{order.customer_phone}</span>
            </>
          ) : null}
        </p>
        {order.delivery_partner &&
          (order.order_status === 'confirmed' ||
            order.order_status === 'preparing' ||
            order.order_status === 'ready' ||
            order.order_status === 'out_for_delivery') && (
          <p className="truncate rounded bg-background px-1.5 py-0.5 text-[10px]">
            Rider:{' '}
            <span className="font-medium text-text-primary">
              {order.delivery_partner}
            </span>
            {order.partner_phone ? ` · ${order.partner_phone}` : ''}
          </p>
        )}
        {order.special_instructions && (
          <p className="line-clamp-1 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] text-text-primary">
            Note: {order.special_instructions}
          </p>
        )}
      </div>

      {isNew && onAccept && onReject ? (
        <div className="mt-auto grid grid-cols-2 gap-1.5 pt-0.5">
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="min-h-8"
            disabled={isUpdating}
            onClick={() => onReject(order)}
          >
            Reject
          </Button>
          <Button
            type="button"
            variant="success"
            size="sm"
            className="min-h-8"
            disabled={isUpdating}
            onClick={() => onAccept(order)}
          >
            Accept
          </Button>
        </div>
      ) : next && onPrimaryAction ? (
        <div className="mt-auto pt-0.5">
          <Button
            type="button"
            variant={next.variant}
            size="sm"
            fullWidth
            className="min-h-8"
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
