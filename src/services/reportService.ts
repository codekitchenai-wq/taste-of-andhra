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

interface OrderRow {
  total: number | string
  created_at: string
}

const DEFAULT_REPORT_DAYS = 90

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

function sumOrderTotals(orders: OrderRow[]): number {
  return orders.reduce((sum, order) => sum + Number(order.total), 0)
}

function aggregateSalesMetrics(orders: OrderRow[]) {
  const todayStart = new Date(startOfDay()).getTime()
  const weekStart = new Date(daysAgo(7)).getTime()
  const monthStart = new Date(startOfMonth()).getTime()

  let todayRevenue = 0
  let weeklyRevenue = 0
  let monthlyRevenue = 0
  let todayOrders = 0
  let weeklyOrders = 0
  let monthlyOrders = 0

  for (const order of orders) {
    const total = Number(order.total)
    const createdAt = new Date(order.created_at).getTime()

    if (createdAt >= todayStart) {
      todayRevenue += total
      todayOrders += 1
    }

    if (createdAt >= weekStart) {
      weeklyRevenue += total
      weeklyOrders += 1
    }

    if (createdAt >= monthStart) {
      monthlyRevenue += total
      monthlyOrders += 1
    }
  }

  const orderCount = orders.length
  const totalRevenue = sumOrderTotals(orders)

  return {
    todayRevenue,
    weeklyRevenue,
    monthlyRevenue,
    totalRevenue,
    orderCount,
    todayOrders,
    weeklyOrders,
    monthlyOrders,
    averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
  }
}

function buildDailyTrend(orders: OrderRow[], days = 7): DailySalesPoint[] {
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

  for (const order of orders) {
    const dateKey = new Date(order.created_at).toISOString().slice(0, 10)
    const point = points.find((entry) => entry.date === dateKey)

    if (point) {
      point.revenue += Number(order.total)
      point.orders += 1
    }
  }

  return points
}

async function fetchNonCancelledOrders(): Promise<ServiceResponse<OrderRow[]>> {
  const { data, error } = await supabase
    .from('orders')
    .select('total, created_at')
    .neq('order_status', 'cancelled')

  if (error) {
    return createErrorResponse('Unable to load orders.', error.message)
  }

  return createSuccessResponse(data ?? [])
}

async function fetchCustomerCounts(monthStart: string) {
  const [customersResult, newCustomersResult] = await Promise.all([
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

  return {
    totalCustomers: customersResult.count ?? 0,
    newCustomers: newCustomersResult.count ?? 0,
    error: customersResult.error ?? newCustomersResult.error,
  }
}

export async function getSalesReport(): Promise<ServiceResponse<SalesReport>> {
  const monthStart = startOfMonth()

  const [ordersResult, customerCounts] = await Promise.all([
    fetchNonCancelledOrders(),
    fetchCustomerCounts(monthStart),
  ])

  if (!ordersResult.success) {
    return ordersResult
  }

  if (customerCounts.error) {
    return createErrorResponse(
      'Unable to load sales report.',
      customerCounts.error.message,
    )
  }

  return createSuccessResponse({
    ...aggregateSalesMetrics(ordersResult.data),
    totalCustomers: customerCounts.totalCustomers,
    newCustomers: customerCounts.newCustomers,
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

  return createSuccessResponse(buildDailyTrend(data ?? [], days))
}

export async function getReportsOverview(): Promise<
  ServiceResponse<ReportsOverview>
> {
  const monthStart = startOfMonth()

  const [ordersResult, customerCounts, popularResult] = await Promise.all([
    fetchNonCancelledOrders(),
    fetchCustomerCounts(monthStart),
    getPopularDishes(10, DEFAULT_REPORT_DAYS),
  ])

  if (!ordersResult.success) {
    return ordersResult
  }

  if (customerCounts.error) {
    return createErrorResponse(
      'Unable to load reports overview.',
      customerCounts.error.message,
    )
  }

  if (!popularResult.success) {
    return popularResult
  }

  const sales = aggregateSalesMetrics(ordersResult.data)
  const weekStart = daysAgo(6)
  const recentOrders = ordersResult.data.filter(
    (order) => order.created_at >= weekStart,
  )

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
    dailyTrend: buildDailyTrend(recentOrders, 7),
    popularDishes: popularResult.data,
  })
}

export async function getPopularDishes(
  limit = 5,
  daysBack = DEFAULT_REPORT_DAYS,
): Promise<ServiceResponse<PopularDishReport[]>> {
  const from = daysAgo(daysBack)

  const { data, error } = await supabase
    .from('order_items')
    .select('quantity, total, dishes(id, name), orders!inner(created_at, order_status)')
    .gte('orders.created_at', from)
    .neq('orders.order_status', 'cancelled')

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

export async function getCategoryRevenue(
  daysBack = DEFAULT_REPORT_DAYS,
): Promise<ServiceResponse<CategoryRevenueReport[]>> {
  const from = daysAgo(daysBack)

  const { data, error } = await supabase
    .from('order_items')
    .select(
      'total, dishes(category_id, categories(name)), orders!inner(created_at, order_status)',
    )
    .gte('orders.created_at', from)
    .neq('orders.order_status', 'cancelled')

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
