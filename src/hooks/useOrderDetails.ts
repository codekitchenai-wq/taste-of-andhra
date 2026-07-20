import { useCallback, useEffect, useState } from 'react'
import * as orderService from '@/services/orderService'
import type { OrderFullDetails } from '@/types/Order'

export function useOrderDetails(orderId: string | undefined) {
  const [order, setOrder] = useState<OrderFullDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!orderId) {
      setOrder(null)
      setIsLoading(false)
      setError('Order not found.')
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await orderService.getOrderDetails(orderId)

    if (result.success) {
      setOrder(result.data)
    } else {
      setError(result.message)
      setOrder(null)
    }

    setIsLoading(false)
  }, [orderId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { order, isLoading, error, refetch }
}
