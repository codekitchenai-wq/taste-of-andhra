import { Calendar, CalendarDays, CalendarRange } from 'lucide-react'
import { DailySalesChart } from '@/components/admin/DailySalesChart'
import { PopularDishesTable } from '@/components/admin/PopularDishesTable'
import { RevenueHeroCard } from '@/components/admin/RevenueHeroCard'
import { SalesPeriodCard } from '@/components/admin/SalesPeriodCard'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAdminReports } from '@/hooks/useAdminReports'

export default function AdminReportsPage() {
  const { reports, isLoading, error, refetch } = useAdminReports()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Daily, weekly, and monthly sales with revenue and popular dish
          insights.
        </p>
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && reports && (
        <>
          <RevenueHeroCard
            totalRevenue={reports.totalRevenue}
            totalOrders={reports.totalOrders}
          />

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Sales</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <SalesPeriodCard
                title="Daily Sales"
                period={reports.dailySales}
                icon={Calendar}
              />
              <SalesPeriodCard
                title="Weekly Sales"
                period={reports.weeklySales}
                icon={CalendarDays}
              />
              <SalesPeriodCard
                title="Monthly Sales"
                period={reports.monthlySales}
                icon={CalendarRange}
              />
            </div>
          </section>

          <DailySalesChart data={reports.dailyTrend} />

          <PopularDishesTable dishes={reports.popularDishes} />
        </>
      )}
    </div>
  )
}
