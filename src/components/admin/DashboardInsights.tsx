import type { DashboardInsight } from '@/services/reportService'
import { cn } from '@/utils/cn'

interface DashboardInsightsProps {
  insights: DashboardInsight[]
  comparedTo: string
}

export function DashboardInsights({
  insights,
  comparedTo,
}: DashboardInsightsProps) {
  return (
    <section className="rounded-[var(--radius-card)] bg-surface p-4 shadow-md">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">Insights</h3>
        <p className="text-xs text-text-secondary">vs {comparedTo}</p>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className={cn(
              'rounded-[var(--radius-button)] px-3 py-2 text-sm',
              insight.tone === 'positive' && 'bg-success/10 text-success',
              insight.tone === 'caution' && 'bg-error/10 text-error',
              insight.tone === 'neutral' && 'bg-background text-text-secondary',
            )}
          >
            {insight.text}
          </li>
        ))}
      </ul>
    </section>
  )
}
