import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MapPin, Navigation } from 'lucide-react'
import toast from 'react-hot-toast'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ROUTES } from '@/constants/ROUTES'
import * as deliveryService from '@/services/deliveryService'
import type { DeliveryWithOrder } from '@/services/deliveryService'
import { formatPrice } from '@/utils/format'

export default function DeliveryOrderPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>()
  const navigate = useNavigate()
  const watchIdRef = useRef<number | null>(null)
  const [delivery, setDelivery] = useState<DeliveryWithOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSharingLocation, setIsSharingLocation] = useState(false)
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

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const stopSharingLocation = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsSharingLocation(false)
  }

  const handleShareLocation = () => {
    if (!deliveryId) return

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device.')
      return
    }

    if (isSharingLocation) {
      stopSharingLocation()
      toast.success('Stopped sharing location')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        void deliveryService.updateDeliveryLocation(
          deliveryId,
          position.coords.latitude,
          position.coords.longitude,
        )
      },
      (geoError) => {
        toast.error(geoError.message || 'Unable to access location.')
        stopSharingLocation()
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )

    watchIdRef.current = watchId
    setIsSharingLocation(true)
    toast.success('Sharing live location')
  }

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
                {delivery.order_number}
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

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={isSharingLocation ? 'secondary' : 'primary'}
              onClick={handleShareLocation}
            >
              <Navigation className="h-4 w-4" />
              {isSharingLocation ? 'Stop Sharing Location' : 'Share Live Location'}
            </Button>
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
