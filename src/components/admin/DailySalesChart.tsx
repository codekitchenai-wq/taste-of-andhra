import type { DailySalesPoint } from '@/services/reportService'
import { formatPrice } from '@/utils/format'

interface DailySalesChartProps {
  data: DailySalesPoint[]
}

export function DailySalesChart({ data }: DailySalesChartProps) {
  const maxRevenue = Math.max(...data.map((point) => point.revenue), 1)

  return (
    <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md md:p-6">
      <h3 className="text-lg font-semibold text-text-primary">
        Daily Sales (Last 7 Days)
      </h3>
      <p className="mt-1 text-sm text-text-secondary">
        Revenue and order volume by day.
      </p>

      <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-4">
        {data.map((point) => {
          const height = Math.max((point.revenue / maxRevenue) * 100, 4)

          return (
            <div
              key={point.date}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="flex h-32 w-full items-end justify-center sm:h-40">
                <div
                  className="w-full max-w-10 rounded-t-[var(--radius-input)] bg-primary/80 transition-all"
                  style={{ height: `${height}%` }}
                  title={`${point.label}: ${formatPrice(point.revenue)}`}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-text-primary sm:text-sm">
                  {point.label}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {point.orders} orders
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-black/5">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-background/60">
            <tr>
              <th className="px-4 py-3 font-semibold">Day</th>
              <th className="px-4 py-3 font-semibold">Orders</th>
              <th className="px-4 py-3 font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.date} className="border-t border-black/5">
                <td className="px-4 py-3 font-medium text-text-primary">
                  {point.label}
                </td>
                <td className="px-4 py-3 text-text-secondary">{point.orders}</td>
                <td className="px-4 py-3 font-medium text-text-primary">
                  {formatPrice(point.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
