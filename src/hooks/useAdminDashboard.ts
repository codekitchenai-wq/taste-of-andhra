import { useMemo, useState } from 'react'
import { useQuery } from '@/hooks/useQuery'
import * as reportService from '@/services/reportService'
import {
  createDashboardRange,
  toLocalDateKey,
  type DashboardDateRange,
  type DashboardRangePreset,
} from '@/utils/dateRange'

export function useAdminDashboard() {
  const today = toLocalDateKey(new Date())
  const [range, setRange] = useState<DashboardDateRange>(() =>
    createDashboardRange('today'),
  )
  const [customFrom, setCustomFrom] = useState(today)
  const [customTo, setCustomTo] = useState(today)

  const rangeKey = useMemo(
    () => `${range.preset}:${range.fromDate}:${range.toDate}`,
    [range],
  )

  const { data, isLoading, error, refetch } = useQuery(
    () => reportService.getDashboardRangeOverview(range),
    [rangeKey],
  )

  const applyPreset = (preset: Exclude<DashboardRangePreset, 'custom'>) => {
    const next = createDashboardRange(preset)
    setRange(next)
    setCustomFrom(next.fromDate)
    setCustomTo(next.toDate)
  }

  const applyCustom = () => {
    const next = createDashboardRange('custom', customFrom, customTo)
    setRange(next)
    setCustomFrom(next.fromDate)
    setCustomTo(next.toDate)
  }

  return {
    overview: data,
    isLoading,
    error,
    refetch,
    range,
    customFrom,
    customTo,
    setCustomFrom,
    setCustomTo,
    applyPreset,
    applyCustom,
  }
}
