import { useCallback, useEffect, useState } from 'react'
import * as reportService from '@/services/reportService'
import type {
  CategoryRevenueReport,
  PopularDishReport,
  SalesReport,
} from '@/services/reportService'

export function useAdminReports() {
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null)
  const [popularDishes, setPopularDishes] = useState<PopularDishReport[]>([])
  const [categoryRevenue, setCategoryRevenue] = useState<
    CategoryRevenueReport[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const [salesResult, popularResult, categoryResult] = await Promise.all([
      reportService.getSalesReport(),
      reportService.getPopularDishes(10),
      reportService.getCategoryRevenue(),
    ])

    if (!salesResult.success) {
      setError(salesResult.message)
      setIsLoading(false)
      return
    }

    if (!popularResult.success) {
      setError(popularResult.message)
      setIsLoading(false)
      return
    }

    if (!categoryResult.success) {
      setError(categoryResult.message)
      setIsLoading(false)
      return
    }

    setSalesReport(salesResult.data)
    setPopularDishes(popularResult.data)
    setCategoryRevenue(categoryResult.data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    salesReport,
    popularDishes,
    categoryRevenue,
    isLoading,
    error,
    refetch,
  }
}
