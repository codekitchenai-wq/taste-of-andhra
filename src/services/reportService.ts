import type { ServiceResponse } from '@/types/api'

export interface SalesReport {
  todayRevenue: number
  weeklyRevenue: number
  monthlyRevenue: number
  orderCount: number
  averageOrderValue: number
  newCustomers: number
  repeatCustomers: number
}

export interface PopularDishReport {
  dishId: string
  dishName: string
  orderCount: number
  revenue: number
}

export interface CategoryRevenueReport {
  categoryId: string
  categoryName: string
  revenue: number
}

export async function getSalesReport(): Promise<ServiceResponse<SalesReport>> {
  throw new Error('Not implemented')
}

export async function getPopularDishes(): Promise<
  ServiceResponse<PopularDishReport[]>
> {
  throw new Error('Not implemented')
}

export async function getCategoryRevenue(): Promise<
  ServiceResponse<CategoryRevenueReport[]>
> {
  throw new Error('Not implemented')
}
