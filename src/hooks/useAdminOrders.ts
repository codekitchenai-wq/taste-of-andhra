import { useCallback, useEffect, useRef, useState } from 'react'
import * as orderService from '@/services/orderService'
import type { AdminOrder, AdminOrderFilters } from '@/services/orderService'

const POLL_INTERVAL_MS = 6_000

export function useAdminOrders(filters?: AdminOrderFilters) {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const refetch = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true)
    }
    setError(null)

    const result = await orderService.getAllOrders(filtersRef.current)

    if (result.success) {
      setOrders(result.data)
    } else {
      setError(result.message)
      if (!options?.silent) {
        setOrders([])
      }
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [
    refetch,
    filters?.status,
    filters?.search,
    filters?.limit,
    filters?.createdFrom,
    filters?.createdTo,
    filters?.estimatedFrom,
    filters?.estimatedTo,
  ])

  useEffect(() => {
    const unsubscribe = orderService.subscribeToOrders(() => {
      void refetch({ silent: true })
    })

    const intervalId = window.setInterval(() => {
      void refetch({ silent: true })
    }, POLL_INTERVAL_MS)

    return () => {
      unsubscribe()
      window.clearInterval(intervalId)
    }
  }, [refetch])

  return { orders, isLoading, error, refetch }
}
