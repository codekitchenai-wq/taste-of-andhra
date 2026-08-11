import { Bell, Volume2, VolumeX, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { AdminOrder } from '@/services/orderService'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { formatPrice } from '@/utils/format'

interface NewOrderAlertProps {
  orders: AdminOrder[]
  isMuted: boolean
  onToggleMute: () => void
  onAccept: (order: AdminOrder) => void
  onDismiss: (orderId: string) => void
  onViewAll?: () => void
}

export function NewOrderAlert({
  orders,
  isMuted,
  onToggleMute,
  onAccept,
  onDismiss,
  onViewAll,
}: NewOrderAlertProps) {
  if (orders.length === 0) return null

  const latest = orders[0]

  return (
    <div
      className="sticky top-0 z-40 -mx-1 rounded-[var(--radius-card)] border-2 border-[#FC8019] bg-[#FC8019] px-4 py-3 text-white shadow-lg"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-heading text-lg font-bold">
              {orders.length === 1
                ? 'New order received'
                : `${orders.length} new orders received`}
            </p>
            <p className="text-sm text-white/90">
              <OrderNumberDisplay
                value={latest.order_number}
                prefixClassName="font-normal text-white/70"
                sequenceClassName="font-bold text-white"
              />{' '}
              · {formatPrice(latest.total)}
              {orders.length > 1 ? ` · +${orders.length - 1} more` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="bg-white/15 text-white hover:bg-white/25"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute alerts' : 'Mute alerts'}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>

          {onViewAll && orders.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="bg-white/15 text-white hover:bg-white/25"
              onClick={onViewAll}
            >
              View all
            </Button>
          )}

          <Button
            type="button"
            size="lg"
            className="min-h-11 bg-success text-white hover:bg-success/90"
            onClick={() => onAccept(latest)}
          >
            Accept
          </Button>

          <button
            type="button"
            onClick={() => onDismiss(latest.id)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white"
            aria-label="Dismiss alert"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
