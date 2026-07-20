import type { LucideIcon } from 'lucide-react'
import type { PeriodSales } from '@/services/reportService'
import { cn } from '@/utils/cn'

interface SalesPeriodCardProps {
  title: string
  period: PeriodSales
  icon: LucideIcon
  className?: string
}

const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function SalesPeriodCard({
  title,
  period,
  icon: Icon,
  className,
}: SalesPeriodCardProps) {
  return (
    <article
      className={cn(
        'rounded-[var(--radius-card)] bg-surface p-5 shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-text-secondary">{title}</h3>
          <p className="mt-2 text-2xl font-bold text-text-primary">
            {priceFormatter.format(period.revenue)}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {period.orders} {period.orders === 1 ? 'order' : 'orders'}
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </article>
  )
}
