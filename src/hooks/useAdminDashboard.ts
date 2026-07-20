import { useQuery } from '@/hooks/useQuery'
import * as reportService from '@/services/reportService'

export function useAdminDashboard() {
  const { data, isLoading, error, refetch } = useQuery(() =>
    reportService.getDashboardOverview(),
  )

  return { overview: data, isLoading, error, refetch }
}
