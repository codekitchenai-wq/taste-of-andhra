import { useMemo } from 'react'
import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import { useAdminOrders } from '@/hooks/useAdminOrders'
import { endOfLocalDayIso, startOfLocalDayIso } from '@/utils/dateRange'
import { isOnamOrder } from '@/utils/onamOrder'

export type OnamOrdersDateFilter = 'all' | (typeof ONAM_SADHYA.dates)[number]['value']

export function useAdminOnamOrders(selectedDate: OnamOrdersDateFilter) {
  const filters = useMemo(() => {
    const fromDate =
      selectedDate === 'all'
        ? ONAM_SADHYA.dates[0].value
        : selectedDate
    const toDate =
      selectedDate === 'all'
        ? ONAM_SADHYA.dates[ONAM_SADHYA.dates.length - 1].value
        : selectedDate

    return {
      estimatedFrom: startOfLocalDayIso(fromDate),
      estimatedTo: endOfLocalDayIso(toDate),
    }
  }, [selectedDate])

  const { orders, isLoading, error, refetch } = useAdminOrders(filters)

  const onamOrders = useMemo(
    () =>
      orders
        .filter(isOnamOrder)
        .sort((a, b) => {
          const aTime = a.estimated_delivery
            ? new Date(a.estimated_delivery).getTime()
            : 0
          const bTime = b.estimated_delivery
            ? new Date(b.estimated_delivery).getTime()
            : 0
          return aTime - bTime || a.created_at.localeCompare(b.created_at)
        }),
    [orders],
  )

  return { onamOrders, isLoading, error, refetch }
}
