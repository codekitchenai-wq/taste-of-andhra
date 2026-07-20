import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import { supabase } from '@/services/supabaseClient'

export interface SalesReport {
  todayRevenue: number
  weeklyRevenue: number
  monthlyRevenue: number
  totalRevenue: number
  orderCount: number
  todayOrders: number
  weeklyOrders: number
  monthlyOrders: number
  averageOrderValue: number
  totalCustomers: number
  newCustomers: number
}

export interface PeriodSales {
  revenue: number
  orders: number
}

export interface DailySalesPoint {
  date: string
  label: string
  revenue: number
  orders: number
}

export interface ReportsOverview {
  totalRevenue: number
  totalOrders: number
  dailySales: PeriodSales
  weeklySales: PeriodSales
  monthlySales: PeriodSales
  dailyTrend: DailySalesPoint[]
  popularDishes: PopularDishReport[]
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

export interface DashboardOverview {
  totalOrders: number
  todayOrders: number
  totalRevenue: number
  todayRevenue: number
  totalCustomers: number
  popularDish: PopularDishReport | null
  recentOrderCount: number
}

function startOfDay(date = new Date()): string {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy.toISOString()
}

function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function startOfMonth(): string {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function sumOrderTotals(
  orders: { total: number | string }[] | null | undefined,
): number {
  return (
    orders?.reduce((sum, order) => sum + Number(order.total), 0) ?? 0
  )
}

async function fetchNonCancelledOrders(from?: string) {
  let query = supabase
    .from('orders')
    .select('total, created_at, user_id')
    .neq('order_status', 'cancelled')

  if (from) {
    query = query.gte('created_at', from)
  }

  return query
}

export async function getSalesReport(): Promise<ServiceResponse<SalesReport>> {
  const todayStart = startOfDay()
  const weekStart = daysAgo(7)
  const monthStart = startOfMonth()

  const [
    allOrdersResult,
    todayOrdersResult,
    weekOrdersResult,
    monthOrdersResult,
    customersResult,
    newCustomersResult,
  ] = await Promise.all([
    supabase.from('orders').select('total').neq('order_status', 'cancelled'),
    fetchNonCancelledOrders(todayStart),
    fetchNonCancelledOrders(weekStart),
    fetchNonCancelledOrders(monthStart),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')
      .gte('created_at', monthStart),
  ])

  if (allOrdersResult.error) {
    return createErrorResponse(
      'Unable to load sales report.',
      allOrdersResult.error.message,
    )
  }

  const allOrders = allOrdersResult.data ?? []
  const orderCount = allOrders.length
  const totalRevenue = sumOrderTotals(allOrders)
  const todayRevenue = sumOrderTotals(todayOrdersResult.data)
  const weeklyRevenue = sumOrderTotals(weekOrdersResult.data)
  const monthlyRevenue = sumOrderTotals(monthOrdersResult.data)

  return createSuccessResponse({
    todayRevenue,
    weeklyRevenue,
    monthlyRevenue,
    totalRevenue,
    orderCount,
    todayOrders: todayOrdersResult.data?.length ?? 0,
    weeklyOrders: weekOrdersResult.data?.length ?? 0,
    monthlyOrders: monthOrdersResult.data?.length ?? 0,
    averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
    totalCustomers: customersResult.count ?? 0,
    newCustomers: newCustomersResult.count ?? 0,
  })
}

export async function getDailySalesTrend(
  days = 7,
): Promise<ServiceResponse<DailySalesPoint[]>> {
  const from = daysAgo(days - 1)

  const { data, error } = await supabase
    .from('orders')
    .select('total, created_at')
    .neq('order_status', 'cancelled')
    .gte('created_at', from)

  if (error) {
    return createErrorResponse(
      'Unable to load daily sales trend.',
      error.message,
    )
  }

  const points: DailySalesPoint[] = []

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - index)
    date.setHours(0, 0, 0, 0)

    points.push({
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
      }),
      revenue: 0,
      orders: 0,
    })
  }

  for (const order of data ?? []) {
    const dateKey = new Date(order.created_at).toISOString().slice(0, 10)
    const point = points.find((entry) => entry.date === dateKey)

    if (point) {
      point.revenue += Number(order.total)
      point.orders += 1
    }
  }

  return createSuccessResponse(points)
}

export async function getReportsOverview(): Promise<
  ServiceResponse<ReportsOverview>
> {
  const [salesResult, trendResult, popularResult] = await Promise.all([
    getSalesReport(),
    getDailySalesTrend(7),
    getPopularDishes(10),
  ])

  if (!salesResult.success) {
    return salesResult
  }

  if (!trendResult.success) {
    return trendResult
  }

  if (!popularResult.success) {
    return popularResult
  }

  const sales = salesResult.data

  return createSuccessResponse({
    totalRevenue: sales.totalRevenue,
    totalOrders: sales.orderCount,
    dailySales: {
      revenue: sales.todayRevenue,
      orders: sales.todayOrders,
    },
    weeklySales: {
      revenue: sales.weeklyRevenue,
      orders: sales.weeklyOrders,
    },
    monthlySales: {
      revenue: sales.monthlyRevenue,
      orders: sales.monthlyOrders,
    },
    dailyTrend: trendResult.data,
    popularDishes: popularResult.data,
  })
}

export async function getPopularDishes(
  limit = 5,
): Promise<ServiceResponse<PopularDishReport[]>> {
  const { data, error } = await supabase
    .from('order_items')
    .select('quantity, total, dishes(id, name)')

  if (error) {
    return createErrorResponse('Unable to load popular dishes.', error.message)
  }

  const aggregated = new Map<string, PopularDishReport>()

  for (const row of data ?? []) {
    const dish = row.dishes as unknown as { id: string; name: string } | null

    if (!dish) continue

    const existing = aggregated.get(dish.id)

    if (existing) {
      existing.orderCount += Number(row.quantity)
      existing.revenue += Number(row.total)
    } else {
      aggregated.set(dish.id, {
        dishId: dish.id,
        dishName: dish.name,
        orderCount: Number(row.quantity),
        revenue: Number(row.total),
      })
    }
  }

  const results = Array.from(aggregated.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)

  return createSuccessResponse(results)
}

export async function getCategoryRevenue(): Promise<
  ServiceResponse<CategoryRevenueReport[]>
> {
  const { data, error } = await supabase
    .from('order_items')
    .select('total, dishes(category_id, categories(name))')

  if (error) {
    return createErrorResponse(
      'Unable to load category revenue.',
      error.message,
    )
  }

  const aggregated = new Map<string, CategoryRevenueReport>()

  for (const row of data ?? []) {
    const dish = row.dishes as unknown as {
      category_id: string
      categories: { name: string } | null
    } | null

    if (!dish?.category_id) continue

    const categoryName = dish.categories?.name ?? 'Unknown'
    const existing = aggregated.get(dish.category_id)

    if (existing) {
      existing.revenue += Number(row.total)
    } else {
      aggregated.set(dish.category_id, {
        categoryId: dish.category_id,
        categoryName,
        revenue: Number(row.total),
      })
    }
  }

  const results = Array.from(aggregated.values()).sort(
    (a, b) => b.revenue - a.revenue,
  )

  return createSuccessResponse(results)
}

export async function getDashboardOverview(): Promise<
  ServiceResponse<DashboardOverview>
> {
  const [salesResult, popularResult] = await Promise.all([
    getSalesReport(),
    getPopularDishes(1),
  ])

  if (!salesResult.success) {
    return salesResult
  }

  if (!popularResult.success) {
    return popularResult
  }

  const sales = salesResult.data

  return createSuccessResponse({
    totalOrders: sales.orderCount,
    todayOrders: sales.todayOrders,
    totalRevenue: sales.totalRevenue,
    todayRevenue: sales.todayRevenue,
    totalCustomers: sales.totalCustomers,
    popularDish: popularResult.data[0] ?? null,
    recentOrderCount: sales.todayOrders,
  })
}
