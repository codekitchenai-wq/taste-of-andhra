import { StatCard } from '@/components/admin/StatCard'
import { ReportTables } from '@/components/admin/ReportTables'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAdminReports } from '@/hooks/useAdminReports'
import { IndianRupee, ShoppingBag, TrendingUp, Users } from 'lucide-react'

const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export default function AdminReportsPage() {
  const {
    salesReport,
    popularDishes,
    categoryRevenue,
    isLoading,
    error,
    refetch,
  } = useAdminReports()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Sales analytics, top dishes, and revenue breakdowns.
        </p>
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && salesReport && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Today's Revenue"
              value={priceFormatter.format(salesReport.todayRevenue)}
              icon={IndianRupee}
            />
            <StatCard
              label="Weekly Revenue"
              value={priceFormatter.format(salesReport.weeklyRevenue)}
              icon={TrendingUp}
            />
            <StatCard
              label="Monthly Revenue"
              value={priceFormatter.format(salesReport.monthlyRevenue)}
              icon={TrendingUp}
            />
            <StatCard
              label="Avg. Order Value"
              value={priceFormatter.format(salesReport.averageOrderValue)}
              icon={ShoppingBag}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Orders"
              value={String(salesReport.orderCount)}
              icon={ShoppingBag}
            />
            <StatCard
              label="Today's Orders"
              value={String(salesReport.todayOrders)}
              icon={ShoppingBag}
            />
            <StatCard
              label="Total Customers"
              value={String(salesReport.totalCustomers)}
              icon={Users}
            />
            <StatCard
              label="New Customers (30d)"
              value={String(salesReport.newCustomers)}
              icon={Users}
            />
          </div>

          <ReportTables
            popularDishes={popularDishes}
            categoryRevenue={categoryRevenue}
          />
        </>
      )}
    </div>
  )
}
