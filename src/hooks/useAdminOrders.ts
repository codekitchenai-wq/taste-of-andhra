import { useCallback, useEffect, useState } from 'react'
import * as orderService from '@/services/orderService'
import type { AdminOrder, AdminOrderFilters } from '@/services/orderService'

export function useAdminOrders(filters?: AdminOrderFilters) {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await orderService.getAllOrders(filters)

    if (result.success) {
      setOrders(result.data)
    } else {
      setError(result.message)
      setOrders([])
    }

    setIsLoading(false)
  }, [filters?.status, filters?.search, filters?.limit])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { orders, isLoading, error, refetch }
}
