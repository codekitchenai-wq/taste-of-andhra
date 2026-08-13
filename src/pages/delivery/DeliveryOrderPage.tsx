import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MapPin, Navigation } from 'lucide-react'
import toast from 'react-hot-toast'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ROUTES } from '@/constants/ROUTES'
import { PartnerTrackingChecklist } from '@/components/delivery/PartnerTrackingChecklist'
import { useLiveLocationSharing } from '@/hooks/useLiveLocationSharing'
import * as deliveryService from '@/services/deliveryService'
import { getPartnerEtaDisplay } from '@/utils/partnerEta'
import type { DeliveryWithOrder } from '@/services/deliveryService'
import { formatPrice } from '@/utils/format'

export default function DeliveryOrderPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>()
  const navigate = useNavigate()
  const [delivery, setDelivery] = useState<DeliveryWithOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const refetch = useCallback(async () => {
    if (!deliveryId) {
      setError('Delivery not found.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await deliveryService.getDeliveryById(deliveryId)

    if (result.success) {
      setDelivery(result.data)
    } else {
      setError(result.message)
      setDelivery(null)
    }

    setIsLoading(false)
  }, [deliveryId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const isActiveDelivery = delivery?.status === 'out_for_delivery'
  const isTrackable =
    delivery != null &&
    delivery.status !== 'delivered' &&
    delivery.status !== 'cancelled'
  const {
    isSharing,
    isScreenAwake,
    lastSentAt,
    lastCoords,
    error: locationError,
    stop: stopSharingLocation,
    toggle: toggleSharingLocation,
  } = useLiveLocationSharing({
    deliveryId,
    autoStart: isActiveDelivery,
  })

  const partnerLat = lastCoords?.lat ?? delivery?.current_lat
  const partnerLng = lastCoords?.lng ?? delivery?.current_lng
  const partnerEta =
    delivery && isActiveDelivery
      ? getPartnerEtaDisplay({
          partnerLat,
          partnerLng,
          dropoffLat: delivery.dropoff_lat,
          dropoffLng: delivery.dropoff_lng,
          locationUpdatedAt:
            lastSentAt?.toISOString() ?? delivery.location_updated_at,
          orderStatus: delivery.status,
        })
      : null

  const handleMarkDelivered = async () => {
    if (!delivery) return

    setIsUpdating(true)

    const result = await deliveryService.updateDeliveryStatus(
      delivery.id,
      'delivered',
    )

    setIsUpdating(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    stopSharingLocation()
    toast.success('Order marked as delivered')
    void refetch()
  }

  return (
    <Container as="div" className="py-8 md:py-12">
      <div className="mb-8">
        <Link
          to={ROUTES.DELIVERY.DASHBOARD}
          className="text-sm font-medium text-primary transition-colors hover:text-primary-dark"
        >
          ← Back to Deliveries
        </Link>
        {delivery && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                <OrderNumberDisplay value={delivery.order_number} />
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                {delivery.customer_name}
                {delivery.customer_phone
                  ? ` · ${delivery.customer_phone}`
                  : ''}
              </p>
            </div>
            <OrderStatusBadge status={delivery.status} />
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

      {!isLoading && !error && delivery && (
        <div className="space-y-6">
          <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
            <h2 className="text-lg font-semibold text-text-primary">
              Delivery Address
            </h2>
            {delivery.delivery_address ? (
              <p className="mt-3 flex items-start gap-2 text-sm text-text-secondary">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {delivery.delivery_address}
              </p>
            ) : (
              <p className="mt-3 text-sm text-text-secondary">
                Address not available.
              </p>
            )}
          </section>

          <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
            <h2 className="text-lg font-semibold text-text-primary">
              Order Summary
            </h2>
            <p className="mt-3 text-sm text-text-secondary">
              Order total:{' '}
              <span className="font-semibold text-text-primary">
                {formatPrice(delivery.order_total)}
              </span>
            </p>
          </section>

          {isTrackable && (
            <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Live Location
                  </h2>
                  <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        isSharing ? 'bg-success' : 'bg-gray-400'
                      }`}
                      aria-hidden="true"
                    />
                    {isSharing
                      ? lastSentAt
                        ? `Sharing with the customer · last update ${lastSentAt.toLocaleTimeString()}`
                        : 'Sharing with the customer · waiting for first GPS fix'
                      : 'Not sharing. The customer cannot see where you are.'}
                  </p>
                  {isSharing && (
                    <p className="mt-1 text-xs text-text-secondary">
                      {isScreenAwake
                        ? 'Screen will stay awake so tracking keeps running.'
                        : 'Keep this screen on — tracking pauses when the phone locks.'}
                    </p>
                  )}
                  {locationError && (
                    <p className="mt-2 text-sm text-error">{locationError}</p>
                  )}
                  {partnerEta?.customerLabel && (
                    <p className="mt-2 text-sm font-medium text-primary">
                      Customer sees: {partnerEta.customerLabel}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant={isSharing ? 'secondary' : 'primary'}
                  onClick={toggleSharingLocation}
                >
                  <Navigation className="h-4 w-4" />
                  {isSharing ? 'Stop Sharing' : 'Share Live Location'}
                </Button>
              </div>
              <PartnerTrackingChecklist
                isSharing={isSharing}
                isScreenAwake={isScreenAwake}
                lastSentAt={lastSentAt}
                locationError={locationError}
              />
            </section>
          )}

          <div className="flex flex-wrap gap-3">
            {delivery.status === 'out_for_delivery' && (
                <Button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => void handleMarkDelivered()}
                >
                  {isUpdating ? 'Updating...' : 'Mark Delivered'}
                </Button>
              )}
          </div>
        </div>
      )}

      {!isLoading && !error && !delivery && (
        <ErrorState
          title="Delivery not found"
          message="We could not find this delivery assignment."
          onRetry={() => navigate(ROUTES.DELIVERY.DASHBOARD)}
        />
      )}
    </Container>
  )
}
