import { IndianRupee } from 'lucide-react'

interface RevenueHeroCardProps {
  totalRevenue: number
  totalOrders: number
}

const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function RevenueHeroCard({
  totalRevenue,
  totalOrders,
}: RevenueHeroCardProps) {
  return (
    <section className="rounded-[var(--radius-card)] bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-lg md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white/80">Total Revenue</p>
          <p className="mt-2 text-3xl font-bold md:text-4xl">
            {priceFormatter.format(totalRevenue)}
          </p>
          <p className="mt-2 text-sm text-white/80">
            From {totalOrders} completed {totalOrders === 1 ? 'order' : 'orders'}
          </p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
          <IndianRupee className="h-7 w-7" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
