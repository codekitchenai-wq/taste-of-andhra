import { Check } from 'lucide-react'
import { ORDER_STATUS, ORDER_TRACKING_STEPS } from '@/constants/ORDER_STATUS'
import type { OrderStatus } from '@/types/enums'
import { cn } from '@/utils/cn'

interface OrderTrackingProps {
  status: OrderStatus
}

export function OrderTracking({ status }: OrderTrackingProps) {
  if (status === 'cancelled') {
    return (
      <div className="rounded-[var(--radius-card)] border border-error/20 bg-error/5 p-4 text-center">
        <p className="font-semibold text-error">Order Cancelled</p>
        <p className="mt-1 text-sm text-text-secondary">
          This order was cancelled and will not be delivered.
        </p>
      </div>
    )
  }

  const currentIndex = ORDER_TRACKING_STEPS.indexOf(status)

  return (
    <ol className="space-y-0">
      {ORDER_TRACKING_STEPS.map((step, index) => {
        const isComplete = index < currentIndex
        const isCurrent = index === currentIndex
        const isLast = index === ORDER_TRACKING_STEPS.length - 1

        return (
          <li key={step} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  'absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5',
                  isComplete ? 'bg-primary' : 'bg-gray-200',
                )}
                aria-hidden="true"
              />
            )}

            <span
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold',
                isComplete && 'border-primary bg-primary text-on-primary',
                isCurrent && 'border-primary bg-primary/10 text-primary',
                !isComplete && !isCurrent && 'border-gray-200 bg-surface text-text-secondary',
              )}
            >
              {isComplete ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>

            <div className="min-w-0 pt-1">
              <p
                className={cn(
                  'font-medium',
                  isCurrent || isComplete
                    ? 'text-text-primary'
                    : 'text-text-secondary',
                )}
              >
                {ORDER_STATUS[step]}
              </p>
              {isCurrent && (
                <p className="mt-0.5 text-sm text-primary">Current status</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
