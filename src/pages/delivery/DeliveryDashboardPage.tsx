import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Navigation2, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ROUTES } from '@/constants/ROUTES'
import * as deliveryService from '@/services/deliveryService'
import type { DeliveryWithOrder } from '@/services/deliveryService'
import { googleMapsNavigationUrl } from '@/utils/deliveryNavigation'
import { formatPrice } from '@/utils/format'

export default function DeliveryDashboardPage() {
  const [deliveries, setDeliveries] = useState<DeliveryWithOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await deliveryService.getMyPartnerDeliveries()

    if (result.success) {
      setDeliveries(result.data)
    } else {
      setError(result.message)
      setDeliveries([])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const handleMarkDelivered = async (deliveryId: string) => {
    setUpdatingId(deliveryId)

    const result = await deliveryService.updateDeliveryStatus(
      deliveryId,
      'delivered',
    )

    setUpdatingId(null)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Order marked as delivered')
    void refetch()
  }

  return (
    <Container as="div" className="py-8 md:py-12">
      <PageHeader
        title="My Deliveries"
        description="View assigned orders and update delivery status."
      />

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && deliveries.length === 0 && (
        <EmptyState
          title="No deliveries assigned"
          description="New delivery assignments will appear here."
          icon={Package}
        />
      )}

      {!isLoading && !error && deliveries.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {deliveries.map((delivery) => {
            const mapsUrl = googleMapsNavigationUrl({
              lat: delivery.dropoff_lat,
              lng: delivery.dropoff_lng,
              address: delivery.delivery_address,
            })

            return (
              <article
                key={delivery.id}
                className="flex flex-col rounded-[var(--radius-card)] bg-surface p-5 shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to={ROUTES.DELIVERY.ORDER(delivery.id)}
                      className="font-semibold text-primary hover:underline"
                    >
                      <OrderNumberDisplay value={delivery.order_number} />
                    </Link>
                    <p className="mt-1 text-sm text-text-secondary">
                      {delivery.customer_name}
                    </p>
                  </div>
                  <OrderStatusBadge status={delivery.status} />
                </div>

                {delivery.delivery_address && (
                  <p className="mt-3 flex items-start gap-2 text-sm text-text-secondary">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {delivery.delivery_address}
                  </p>
                )}

                <p className="mt-2 text-sm font-medium text-text-primary">
                  {formatPrice(delivery.order_total)}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={ROUTES.DELIVERY.ORDER(delivery.id)}
                    className="inline-flex h-9 items-center justify-center rounded-[var(--radius-button)] border-2 border-primary bg-surface px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                  >
                    View Details
                  </Link>
                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-button)] border-2 border-primary bg-surface px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                    >
                      <Navigation2 className="h-3.5 w-3.5" />
                      Maps
                    </a>
                  ) : null}
                  {delivery.status === 'out_for_delivery' && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={updatingId === delivery.id}
                      onClick={() => void handleMarkDelivered(delivery.id)}
                    >
                      {updatingId === delivery.id
                        ? 'Updating...'
                        : 'Mark Delivered'}
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </Container>
  )
}
