import { Link } from 'react-router-dom'
import {
  BarChart3,
  Bike,
  FolderOpen,
  IndianRupee,
  Phone,
  ShoppingBag,
  Tag,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { DailySalesChart } from '@/components/admin/DailySalesChart'
import { DashboardInsights } from '@/components/admin/DashboardInsights'
import { DashboardRangeControls } from '@/components/admin/DashboardRangeControls'
import { PopularDishesTable } from '@/components/admin/PopularDishesTable'
import { QuickLinkCard } from '@/components/admin/QuickLinkCard'
import { StatCard } from '@/components/admin/StatCard'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import { ROUTES } from '@/constants/ROUTES'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import type { OrderStatus } from '@/types/enums'
import { formatPrice } from '@/utils/format'

function formatChange(pct: number | null): string {
  if (pct == null) return 'No prior period'
  const rounded = Math.round(pct)
  if (rounded === 0) return 'Flat vs prior'
  return `${rounded > 0 ? '+' : ''}${rounded}% vs prior`
}

const STATUS_ORDER: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
]

export default function AdminDashboardPage() {
  const {
    overview,
    isLoading,
    error,
    refetch,
    range,
    customFrom,
    customTo,
    setCustomFrom,
    setCustomTo,
    applyPreset,
    applyCustom,
  } = useAdminDashboard()

  return (
    <div className="space-y-4">
      <DashboardRangeControls
        range={range}
        customFrom={customFrom}
        customTo={customTo}
        onPreset={applyPreset}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onApplyCustom={applyCustom}
      />

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && overview && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Orders"
              value={String(overview.orders)}
              icon={ShoppingBag}
              trend={formatChange(overview.ordersChangePct)}
            />
            <StatCard
              label="Revenue"
              value={formatPrice(overview.revenue)}
              icon={IndianRupee}
              trend={formatChange(overview.revenueChangePct)}
            />
            <StatCard
              label="Avg order value"
              value={formatPrice(overview.averageOrderValue)}
              icon={TrendingUp}
              trend={`${overview.deliveryOrders} delivery · ${overview.pickupOrders} pickup`}
            />
            <StatCard
              label="Customers"
              value={String(overview.totalCustomers)}
              icon={Users}
              trend={
                overview.newCustomers > 0
                  ? `${overview.newCustomers} new in period`
                  : 'No new signups in period'
              }
            />
          </div>

          <DashboardInsights
            insights={overview.insights}
            comparedTo={overview.previousLabel}
          />

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <DailySalesChart
              data={overview.dailyTrend}
              title={`Sales · ${overview.range.label}`}
              description="Non-cancelled revenue by day in the selected range."
            />

            <div className="space-y-4">
              <section className="rounded-[var(--radius-card)] bg-surface p-4 shadow-md">
                <h3 className="text-sm font-semibold text-text-primary">
                  Order mix
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-secondary">Delivery</dt>
                    <dd className="font-medium text-text-primary">
                      {overview.deliveryOrders}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-secondary">Pickup</dt>
                    <dd className="font-medium text-text-primary">
                      {overview.pickupOrders}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-secondary">App</dt>
                    <dd className="font-medium text-text-primary">
                      {overview.appOrders}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-text-secondary">
                      <Phone className="h-3.5 w-3.5" />
                      Phone / Counter
                    </dt>
                    <dd className="font-medium text-text-primary">
                      {overview.phoneOrders}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-black/5 pt-2">
                    <dt className="text-text-secondary">Cancelled</dt>
                    <dd className="font-medium text-error">
                      {overview.cancelledOrders}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-secondary">Completion</dt>
                    <dd className="font-medium text-text-primary">
                      {Math.round(overview.completionRate)}%
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-[var(--radius-card)] bg-surface p-4 shadow-md">
                <h3 className="text-sm font-semibold text-text-primary">
                  Status breakdown
                </h3>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {STATUS_ORDER.map((status) => {
                    const count = overview.statusCounts[status] ?? 0
                    if (count === 0) return null
                    return (
                      <li
                        key={status}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-text-secondary">
                          {ORDER_STATUS[status]}
                        </span>
                        <span className="font-medium text-text-primary">
                          {count}
                        </span>
                      </li>
                    )
                  })}
                  {STATUS_ORDER.every(
                    (status) => !(overview.statusCounts[status] ?? 0),
                  ) && (
                    <li className="text-text-secondary">No orders in range.</li>
                  )}
                </ul>
              </section>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-text-primary">
                Top dishes
              </h3>
              <Link
                to={ROUTES.ADMIN.REPORTS}
                className="text-sm font-medium text-primary hover:text-primary-dark"
              >
                Full reports
              </Link>
            </div>
            <PopularDishesTable dishes={overview.popularDishes} hideHeader />
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-semibold text-text-primary">
              Quick links
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <QuickLinkCard
                title="Orders"
                description="Kitchen board"
                to={ROUTES.ADMIN.ORDERS}
                icon={ShoppingBag}
              />
              <QuickLinkCard
                title="Phone / Counter"
                description="Create staff orders"
                to={ROUTES.ADMIN.PHONE_ORDER}
                icon={Phone}
              />
              <QuickLinkCard
                title="Delivery"
                description="Assign ready orders"
                to={ROUTES.ADMIN.DELIVERY}
                icon={Bike}
              />
              <QuickLinkCard
                title="Dishes"
                description="Menu & pricing"
                to={ROUTES.ADMIN.DISHES}
                icon={UtensilsCrossed}
              />
              <QuickLinkCard
                title="Offers"
                description="Promotions"
                to={ROUTES.ADMIN.OFFERS}
                icon={Tag}
              />
              <QuickLinkCard
                title="Reports"
                description="Deeper analytics"
                to={ROUTES.ADMIN.REPORTS}
                icon={BarChart3}
              />
              <QuickLinkCard
                title="Categories"
                description="Menu structure"
                to={ROUTES.ADMIN.CATEGORIES}
                icon={FolderOpen}
              />
              <QuickLinkCard
                title="Customers"
                description="Accounts"
                to={ROUTES.ADMIN.CUSTOMERS}
                icon={Users}
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
