import { useCallback, useEffect, useState } from 'react'
import * as orderService from '@/services/orderService'
import type { Order } from '@/types/Order'

export function useCustomerOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await orderService.getCustomerOrders()

    if (result.success) {
      setOrders(result.data)
    } else {
      setError(result.message)
      setOrders([])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { orders, isLoading, error, refetch }
}
