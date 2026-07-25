import { useEffect, useState } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import type { OrderStatus } from '@/types/enums'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/format'
import { getEtaDisplay } from '@/utils/orderEta'

interface OrderEtaBannerProps {
  estimatedDelivery: string | null | undefined
  orderStatus: OrderStatus
  /** Compact badge for kitchen cards / tables */
  variant?: 'banner' | 'badge'
  className?: string
}

export function OrderEtaBanner({
  estimatedDelivery,
  orderStatus,
  variant = 'banner',
  className,
}: OrderEtaBannerProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1_000)
    return () => window.clearInterval(id)
  }, [])

  const eta = getEtaDisplay(estimatedDelivery, orderStatus, nowMs)

  if (variant === 'badge') {
    if (eta.isInactive && !eta.isDelayed) {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs font-medium text-text-secondary',
            className,
          )}
        >
          <Clock className="h-3 w-3" aria-hidden="true" />
          {eta.shortLabel}
        </span>
      )
    }

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold',
          eta.isDelayed
            ? 'bg-error/15 text-error'
            : 'bg-primary/10 text-primary',
          className,
        )}
      >
        {eta.isDelayed ? (
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Clock className="h-3 w-3" aria-hidden="true" />
        )}
        {eta.shortLabel}
      </span>
    )
  }

  if (eta.isInactive && orderStatus !== 'delivered') {
    return null
  }

  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border px-4 py-3',
        eta.isDelayed
          ? 'border-error/30 bg-error/5'
          : 'border-primary/20 bg-primary/5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            eta.isDelayed ? 'bg-error/15 text-error' : 'bg-primary/15 text-primary',
          )}
        >
          {eta.isDelayed ? (
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Clock className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              'font-semibold',
              eta.isDelayed ? 'text-error' : 'text-text-primary',
            )}
          >
            {eta.customerLabel}
          </p>
          {estimatedDelivery && orderStatus !== 'delivered' && (
            <p className="mt-1 text-sm text-text-secondary">
              Expected by {formatDateTime(estimatedDelivery)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
