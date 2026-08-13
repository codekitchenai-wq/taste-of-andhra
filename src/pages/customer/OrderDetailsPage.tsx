import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FileText } from 'lucide-react'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { GoogleReviewPrompt } from '@/components/orders/GoogleReviewPrompt'
import { LiveTrackingMap } from '@/components/orders/LiveTrackingMap'
import { OrderDetailsPanel } from '@/components/orders/OrderDetailsPanel'
import { OrderEtaBanner } from '@/components/orders/OrderEtaBanner'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { OrderTracking } from '@/components/orders/OrderTracking'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { CANCELLABLE_ORDER_STATUSES } from '@/constants/ORDER_STATUS'
import { ROUTES } from '@/constants/ROUTES'
import { useGstSettings } from '@/hooks/useGstSettings'
import { useOrderDetails } from '@/hooks/useOrderDetails'
import * as orderService from '@/services/orderService'

export default function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { order, isLoading, error, refetch } = useOrderDetails(orderId)
  const { settings: gstSettings } = useGstSettings()

  const canCancel =
    order && CANCELLABLE_ORDER_STATUSES.includes(order.order_status)

  const showLiveTracking =
    order &&
    (order.order_status === 'out_for_delivery' ||
      order.order_status === 'delivered')

  const handleCancel = async () => {
    if (!order) return

    const result = await orderService.cancelOrder(order.id)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Order cancelled')
    void refetch()
  }

  return (
    <Container as="div" className="py-8 md:py-12">
      <div className="mb-8">
        <Link
          to={ROUTES.ORDERS}
          className="text-sm font-medium text-primary transition-colors hover:text-primary-dark"
        >
          ← Back to My Orders
        </Link>
        {order && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                <OrderNumberDisplay value={order.order_number} />
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                Track your order and view full details.
              </p>
            </div>
            <OrderStatusBadge status={order.order_status} />
          </div>
        )}
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState
          message={error}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !error && order && (
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-lg font-semibold text-text-primary">
              Order Tracking
            </h2>
            <div className="mt-4">
              <OrderEtaBanner
                estimatedDelivery={order.estimated_delivery}
                orderStatus={order.order_status}
              />
            </div>
            <div className="mt-6">
              <OrderTracking status={order.order_status} />
            </div>
            {showLiveTracking && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">
                  Live Delivery Map
                </h3>
                <LiveTrackingMap
                  orderId={order.id}
                  dropoffLat={order.address?.latitude}
                  dropoffLng={order.address?.longitude}
                />
              </div>
            )}
            {order.order_status === 'delivered' && (
              <div className="mt-6">
                <GoogleReviewPrompt />
              </div>
            )}
            {gstSettings.enabled && (
              <Link
                to={ROUTES.ORDER_INVOICE(order.id)}
                className="mt-6 flex items-center justify-center gap-2 rounded-[var(--radius-button)] border-2 border-primary bg-surface px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
              >
                <FileText className="h-4 w-4" />
                View GST Invoice
              </Link>
            )}
            {canCancel && (
              <Button
                type="button"
                variant="danger"
                fullWidth
                className="mt-4"
                onClick={() => void handleCancel()}
              >
                Cancel Order
              </Button>
            )}
          </section>

          <OrderDetailsPanel order={order} />
        </div>
      )}

      {!isLoading && !error && !order && (
        <ErrorState
          title="Order not found"
          message="We could not find this order."
          onRetry={() => navigate(ROUTES.ORDERS)}
        />
      )}
    </Container>
  )
}
