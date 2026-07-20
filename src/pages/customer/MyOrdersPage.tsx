import { useNavigate } from 'react-router-dom'
import { OrderListCard } from '@/components/orders/OrderListCard'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ROUTES } from '@/constants/ROUTES'
import { useCustomerOrders } from '@/hooks/useCustomerOrders'

export default function MyOrdersPage() {
  const navigate = useNavigate()
  const { orders, isLoading, error, refetch } = useCustomerOrders()

  return (
    <Container as="div" className="py-8 md:py-12">
      <PageHeader
        title="My Orders"
        description="View order history, track status, and see payment details."
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
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((order) => (
            <OrderListCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </Container>
  )
}
