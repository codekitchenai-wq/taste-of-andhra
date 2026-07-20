import { Link } from 'react-router-dom'
import {
  BarChart3,
  FolderOpen,
  IndianRupee,
  ShoppingBag,
  Tag,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { OrderTable } from '@/components/admin/OrderTable'
import { QuickLinkCard } from '@/components/admin/QuickLinkCard'
import { StatCard } from '@/components/admin/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ROUTES } from '@/constants/ROUTES'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import { useAdminOrders } from '@/hooks/useAdminOrders'
import * as orderService from '@/services/orderService'
import type { OrderStatus } from '@/types/enums'

const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export default function AdminDashboardPage() {
  const { overview, isLoading, error, refetch } = useAdminDashboard()
  const {
    orders: recentOrders,
    isLoading: isOrdersLoading,
    refetch: refetchOrders,
  } = useAdminOrders({ limit: 5 })

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    const result = await orderService.updateOrderStatus(orderId, status)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Order status updated')
    void refetchOrders()
    void refetch()
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Overview of orders, revenue, customers, and restaurant performance.
        </p>
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && overview && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Total Orders"
              value={String(overview.totalOrders)}
              icon={ShoppingBag}
            />
            <StatCard
              label="Today's Orders"
              value={String(overview.todayOrders)}
              icon={TrendingUp}
              trend="Orders placed today"
            />
            <StatCard
              label="Total Revenue"
              value={priceFormatter.format(overview.totalRevenue)}
              icon={IndianRupee}
            />
            <StatCard
              label="Customers"
              value={String(overview.totalCustomers)}
              icon={Users}
            />
            <StatCard
              label="Popular Dish"
              value={overview.popularDish?.dishName ?? '—'}
              icon={UtensilsCrossed}
              trend={
                overview.popularDish
                  ? `${overview.popularDish.orderCount} sold`
                  : 'No sales yet'
              }
            />
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-text-primary">
                Recent Orders
              </h3>
              <Link
                to={ROUTES.ADMIN.ORDERS}
                className="text-sm font-medium text-primary hover:text-primary-dark"
              >
                View all
              </Link>
            </div>

            {isOrdersLoading && <LoadingState variant="inline" />}

            {!isOrdersLoading && recentOrders.length === 0 && (
              <EmptyState
                title="No orders yet"
                description="Orders will appear here once customers start placing them."
              />
            )}

            {!isOrdersLoading && recentOrders.length > 0 && (
              <OrderTable
                orders={recentOrders}
                onStatusChange={(orderId, status) =>
                  void handleStatusChange(orderId, status)
                }
              />
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">
              Manage Restaurant
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <QuickLinkCard
                title="Categories"
                description="Organize menu categories"
                to={ROUTES.ADMIN.CATEGORIES}
                icon={FolderOpen}
              />
              <QuickLinkCard
                title="Dishes"
                description="Manage menu items and pricing"
                to={ROUTES.ADMIN.DISHES}
                icon={UtensilsCrossed}
              />
              <QuickLinkCard
                title="Orders"
                description="Track and update order status"
                to={ROUTES.ADMIN.ORDERS}
                icon={ShoppingBag}
              />
              <QuickLinkCard
                title="Customers"
                description="View registered customers"
                to={ROUTES.ADMIN.CUSTOMERS}
                icon={Users}
              />
              <QuickLinkCard
                title="Offers"
                description="Create promotions and coupons"
                to={ROUTES.ADMIN.OFFERS}
                icon={Tag}
              />
              <QuickLinkCard
                title="Reports"
                description="Sales analytics and insights"
                to={ROUTES.ADMIN.REPORTS}
                icon={BarChart3}
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
