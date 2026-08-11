import { cn } from '@/utils/cn'
import { splitOrderNumber } from '@/utils/orderNumber'

interface OrderNumberDisplayProps {
  value: string
  className?: string
  /** Applied to the leading prefix/date portion. */
  prefixClassName?: string
  /** Applied to the last 4 digits. */
  sequenceClassName?: string
}

/** Renders an order number with the last 4 digits emphasized. */
export function OrderNumberDisplay({
  value,
  className,
  prefixClassName,
  sequenceClassName,
}: OrderNumberDisplayProps) {
  const { prefix, sequence } = splitOrderNumber(value)

  return (
    <span className={cn('inline-flex items-baseline gap-0', className)}>
      {prefix ? (
        <span
          className={cn(
            'font-normal text-text-secondary',
            prefixClassName,
          )}
        >
          {prefix}
        </span>
      ) : null}
      <span
        className={cn(
          'font-bold tracking-wide text-primary',
          sequenceClassName,
        )}
      >
        {sequence}
      </span>
    </span>
  )
}
