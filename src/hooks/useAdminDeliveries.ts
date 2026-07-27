import { useCallback, useEffect, useState } from 'react'
import * as deliveryService from '@/services/deliveryService'
import type { AdminOrder } from '@/services/orderService'
import type { DeliveryWithOrder } from '@/services/deliveryService'

export function useAdminDeliveries() {
  const [deliveries, setDeliveries] = useState<DeliveryWithOrder[]>([])
  const [awaitingOrders, setAwaitingOrders] = useState<AdminOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const [deliveriesResult, awaitingResult] = await Promise.all([
      deliveryService.getDeliveries(),
      deliveryService.getOrdersAwaitingDelivery(),
    ])

    if (deliveriesResult.success) {
      setDeliveries(deliveriesResult.data)
    } else {
      setError(deliveriesResult.message)
      setDeliveries([])
    }

    if (awaitingResult.success) {
      setAwaitingOrders(awaitingResult.data)
    } else if (!deliveriesResult.success) {
      setError(awaitingResult.message)
      setAwaitingOrders([])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  // Keep partner positions current without refetching the whole board, so the
  // location column and the tracking map stay live between manual refreshes.
  useEffect(() => {
    return deliveryService.subscribeToAllDeliveries((updated) => {
      setDeliveries((previous) =>
        previous.map((delivery) =>
          delivery.id === updated.id
            ? { ...delivery, ...updated }
            : delivery,
        ),
      )
    })
  }, [])

  return { deliveries, awaitingOrders, isLoading, error, refetch }
}
