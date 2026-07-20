import { useQuery } from '@/hooks/useQuery'
import * as orderService from '@/services/orderService'

export function useCustomerOrders() {
  const { data, isLoading, error, refetch } = useQuery(() =>
    orderService.getCustomerOrders(),
  )

  return { orders: data ?? [], isLoading, error, refetch }
}
