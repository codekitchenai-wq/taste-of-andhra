import type { DailySalesPoint } from '@/services/reportService'
import { formatPrice } from '@/utils/format'

interface DailySalesChartProps {
  data: DailySalesPoint[]
  title?: string
  description?: string
}

export function DailySalesChart({
  data,
  title = 'Daily Sales',
  description = 'Revenue and order volume by day.',
}: DailySalesChartProps) {
  const maxRevenue = Math.max(...data.map((point) => point.revenue), 1)
  const columns = Math.min(Math.max(data.length, 1), 14)

  return (
    <section className="rounded-[var(--radius-card)] bg-surface p-4 shadow-md sm:p-5">
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>

      <div
        className="mt-5 grid gap-1.5 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {data.map((point) => {
          const height = Math.max((point.revenue / maxRevenue) * 100, 4)

          return (
            <div
              key={point.date}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="flex h-28 w-full items-end justify-center sm:h-36">
                <div
                  className="w-full max-w-10 rounded-t-[var(--radius-input)] bg-primary/80 transition-all"
                  style={{ height: `${height}%` }}
                  title={`${point.label}: ${formatPrice(point.revenue)}`}
                />
              </div>
              <div>
                <p className="text-[10px] font-medium text-text-primary sm:text-xs">
                  {point.label}
                </p>
                <p className="mt-0.5 text-[10px] text-text-secondary sm:text-xs">
                  {point.orders}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {data.length <= 14 && (
        <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-black/5">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-background/60">
              <tr>
                <th className="px-3 py-2 font-semibold">Day</th>
                <th className="px-3 py-2 font-semibold">Orders</th>
                <th className="px-3 py-2 font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.date} className="border-t border-black/5">
                  <td className="px-3 py-2 font-medium text-text-primary">
                    {point.label}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {point.orders}
                  </td>
                  <td className="px-3 py-2 font-medium text-text-primary">
                    {formatPrice(point.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
