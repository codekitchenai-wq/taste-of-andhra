import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OrderListCard } from '@/components/orders/OrderListCard'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ROUTES } from '@/constants/ROUTES'
import { useCustomerOrders } from '@/hooks/useCustomerOrders'
import { cn } from '@/utils/cn'
import { isActiveOrderStatus } from '@/utils/orderStatusStyles'

type OrdersTab = 'active' | 'past' | 'all'

export default function MyOrdersPage() {
  const navigate = useNavigate()
  const { orders, isLoading, error, refetch } = useCustomerOrders()
  const [tab, setTab] = useState<OrdersTab | null>(null)

  const { activeOrders, pastOrders } = useMemo(() => {
    const active = orders.filter((order) =>
      isActiveOrderStatus(order.order_status),
    )
    const past = orders.filter(
      (order) => !isActiveOrderStatus(order.order_status),
    )
    return { activeOrders: active, pastOrders: past }
  }, [orders])

  const selectedTab: OrdersTab =
    tab ?? (activeOrders.length > 0 ? 'active' : 'all')

  const displayOrders =
    selectedTab === 'active'
      ? activeOrders
      : selectedTab === 'past'
        ? pastOrders
        : orders

  const tabs: { id: OrdersTab; label: string; count: number }[] = [
    { id: 'active', label: 'Active', count: activeOrders.length },
    { id: 'past', label: 'Past', count: pastOrders.length },
    { id: 'all', label: 'All', count: orders.length },
  ]

  return (
    <Container as="div" className="py-8 md:py-12">
      <PageHeader
        title="My Orders"
        description="Check the current status of any order you placed. Tap an order to see the full tracking timeline."
      />

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && orders.length === 0 && (
        <EmptyState
          title="No orders yet"
          description="Your order history will appear here after you place your first order."
          actionLabel="Browse Menu"
          onAction={() => navigate(ROUTES.MENU)}
        />
      )}

      {!isLoading && !error && orders.length > 0 && (
        <>
          <div
            className="mb-6 flex flex-wrap gap-2"
            role="tablist"
            aria-label="Order status filters"
          >
            {tabs.map((item) => {
              const selected = item.id === selectedTab
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'rounded-[var(--radius-button)] border px-3 py-1.5 text-sm font-medium transition-colors',
                    selected
                      ? 'border-transparent bg-primary text-on-primary'
                      : 'border-black/10 bg-surface text-text-primary hover:border-primary/40 hover:text-primary',
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      'ml-1.5 tabular-nums',
                      selected ? 'text-white/80' : 'text-text-secondary',
                    )}
                  >
                    {item.count}
                  </span>
                </button>
              )
            })}
          </div>

          {displayOrders.length === 0 ? (
            <EmptyState
              title={
                selectedTab === 'active'
                  ? 'No active orders'
                  : selectedTab === 'past'
                    ? 'No past orders'
                    : 'No orders'
              }
              description={
                selectedTab === 'active'
                  ? 'When you place an order, its live status will show here until it is delivered or cancelled.'
                  : 'Orders you have placed will appear in this list.'
              }
              actionLabel={
                selectedTab === 'active' ? 'View all orders' : 'Browse Menu'
              }
              onAction={() =>
                selectedTab === 'active'
                  ? setTab('all')
                  : navigate(ROUTES.MENU)
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {displayOrders.map((order) => (
                <OrderListCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </>
      )}
    </Container>
  )
}
