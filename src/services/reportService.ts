import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import { supabase } from '@/services/supabaseClient'
import type { FulfillmentType, OrderStatus } from '@/types/enums'
import type { DashboardDateRange } from '@/utils/dateRange'
import {
  createDashboardRange,
  endOfLocalDayIso,
  formatRangeLabel,
  getPreviousComparableRange,
  parseLocalDateKey,
  startOfLocalDayIso,
  toLocalDateKey,
} from '@/utils/dateRange'

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

export interface DashboardInsight {
  id: string
  tone: 'positive' | 'neutral' | 'caution'
  text: string
}

export interface DashboardRangeOverview {
  range: DashboardDateRange
  previousLabel: string
  orders: number
  revenue: number
  averageOrderValue: number
  cancelledOrders: number
  completionRate: number
  previousOrders: number
  previousRevenue: number
  ordersChangePct: number | null
  revenueChangePct: number | null
  deliveryOrders: number
  pickupOrders: number
  phoneOrders: number
  appOrders: number
  statusCounts: Partial<Record<OrderStatus, number>>
  dailyTrend: DailySalesPoint[]
  popularDishes: PopularDishReport[]
  newCustomers: number
  totalCustomers: number
  insights: DashboardInsight[]
  peakDay: DailySalesPoint | null
}

interface OrderRow {
  total: number | string
  created_at: string
}

interface DashboardOrderRow {
  total: number | string
  created_at: string
  order_status: OrderStatus
  fulfillment_type: FulfillmentType | null
  order_source: string | null
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

async function fetchCustomerCountsInRange(fromDate: string, toDate: string) {
  const [customersResult, newCustomersResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer'),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')
      .gte('created_at', startOfLocalDayIso(fromDate))
      .lte('created_at', endOfLocalDayIso(toDate)),
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

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0
  return ((current - previous) / previous) * 100
}

function buildDailyTrendForRange(
  orders: Array<{ total: number | string; created_at: string }>,
  fromDate: string,
  toDate: string,
): DailySalesPoint[] {
  const points: DailySalesPoint[] = []
  const cursor = parseLocalDateKey(fromDate)
  const end = parseLocalDateKey(toDate)

  while (cursor.getTime() <= end.getTime()) {
    const key = toLocalDateKey(cursor)
    points.push({
      date: key,
      label: cursor.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      }),
      revenue: 0,
      orders: 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const order of orders) {
    const dateKey = toLocalDateKey(new Date(order.created_at))
    const point = points.find((entry) => entry.date === dateKey)
    if (!point) continue
    point.revenue += Number(order.total)
    point.orders += 1
  }

  return points
}

async function fetchOrdersInRange(
  fromDate: string,
  toDate: string,
): Promise<ServiceResponse<DashboardOrderRow[]>> {
  const { data, error } = await supabase
    .from('orders')
    .select('total, created_at, order_status, fulfillment_type, order_source')
    .gte('created_at', startOfLocalDayIso(fromDate))
    .lte('created_at', endOfLocalDayIso(toDate))

  if (error) {
    return createErrorResponse('Unable to load dashboard orders.', error.message)
  }

  return createSuccessResponse((data ?? []) as DashboardOrderRow[])
}

async function getPopularDishesInRange(
  fromDate: string,
  toDate: string,
  limit = 5,
): Promise<ServiceResponse<PopularDishReport[]>> {
  const { data, error } = await supabase
    .from('order_items')
    .select(
      'quantity, total, dishes(id, name), orders!inner(created_at, order_status)',
    )
    .gte('orders.created_at', startOfLocalDayIso(fromDate))
    .lte('orders.created_at', endOfLocalDayIso(toDate))
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

  return createSuccessResponse(
    Array.from(aggregated.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit),
  )
}

function buildDashboardInsights(input: {
  range: DashboardDateRange
  orders: number
  revenue: number
  averageOrderValue: number
  cancelledOrders: number
  completionRate: number
  ordersChangePct: number | null
  revenueChangePct: number | null
  deliveryOrders: number
  pickupOrders: number
  phoneOrders: number
  popularDish: PopularDishReport | null
  peakDay: DailySalesPoint | null
  newCustomers: number
}): DashboardInsight[] {
  const insights: DashboardInsight[] = []
  const activeOrders = Math.max(0, input.orders - input.cancelledOrders)

  if (input.revenueChangePct != null) {
    const abs = Math.abs(Math.round(input.revenueChangePct))
    if (input.revenueChangePct > 5) {
      insights.push({
        id: 'revenue-up',
        tone: 'positive',
        text: `Revenue is up ${abs}% vs the previous period.`,
      })
    } else if (input.revenueChangePct < -5) {
      insights.push({
        id: 'revenue-down',
        tone: 'caution',
        text: `Revenue is down ${abs}% vs the previous period.`,
      })
    } else {
      insights.push({
        id: 'revenue-flat',
        tone: 'neutral',
        text: 'Revenue is roughly flat vs the previous period.',
      })
    }
  } else if (input.revenue > 0) {
    insights.push({
      id: 'revenue-new',
      tone: 'positive',
      text: `₹${Math.round(input.revenue).toLocaleString('en-IN')} earned in this period (no prior sales to compare).`,
    })
  }

  if (input.orders > 0) {
    insights.push({
      id: 'aov',
      tone: 'neutral',
      text: `Average order value is ₹${Math.round(input.averageOrderValue).toLocaleString('en-IN')}.`,
    })
  }

  if (input.popularDish) {
    insights.push({
      id: 'top-dish',
      tone: 'positive',
      text: `Top seller: ${input.popularDish.dishName} (${input.popularDish.orderCount} sold).`,
    })
  }

  if (activeOrders > 0) {
    const deliveryShare = Math.round(
      (input.deliveryOrders / activeOrders) * 100,
    )
    insights.push({
      id: 'fulfillment',
      tone: 'neutral',
      text: `${deliveryShare}% delivery · ${100 - deliveryShare}% pickup in this period.`,
    })
  }

  if (input.phoneOrders > 0 && input.orders > 0) {
    const phoneShare = Math.round((input.phoneOrders / input.orders) * 100)
    insights.push({
      id: 'phone-share',
      tone: 'neutral',
      text: `${phoneShare}% of orders came from phone / counter.`,
    })
  }

  if (input.peakDay && input.peakDay.orders > 0 && input.range.fromDate !== input.range.toDate) {
    insights.push({
      id: 'peak-day',
      tone: 'positive',
      text: `Busiest day: ${input.peakDay.label} (${input.peakDay.orders} orders).`,
    })
  }

  if (input.cancelledOrders > 0) {
    insights.push({
      id: 'cancelled',
      tone: 'caution',
      text: `${input.cancelledOrders} cancelled · ${Math.round(input.completionRate)}% completion rate.`,
    })
  }

  if (input.newCustomers > 0) {
    insights.push({
      id: 'new-customers',
      tone: 'positive',
      text: `${input.newCustomers} new customer${input.newCustomers === 1 ? '' : 's'} registered in this period.`,
    })
  }

  if (insights.length === 0) {
    insights.push({
      id: 'empty',
      tone: 'neutral',
      text: 'No orders in this period yet. Try another date range.',
    })
  }

  return insights.slice(0, 6)
}

export async function getDashboardRangeOverview(
  rangeInput?: DashboardDateRange,
): Promise<ServiceResponse<DashboardRangeOverview>> {
  const range = rangeInput ?? createDashboardRange('today')
  const previous = getPreviousComparableRange(range)

  const [currentResult, previousResult, popularResult, customerCounts] =
    await Promise.all([
      fetchOrdersInRange(range.fromDate, range.toDate),
      fetchOrdersInRange(previous.fromDate, previous.toDate),
      getPopularDishesInRange(range.fromDate, range.toDate, 5),
      fetchCustomerCountsInRange(range.fromDate, range.toDate),
    ])

  if (!currentResult.success) return currentResult
  if (!previousResult.success) return previousResult
  if (!popularResult.success) return popularResult
  if (customerCounts.error) {
    return createErrorResponse(
      'Unable to load customer metrics.',
      customerCounts.error.message,
    )
  }

  const currentOrders = currentResult.data
  const previousOrdersRows = previousResult.data

  const active = currentOrders.filter((order) => order.order_status !== 'cancelled')
  const cancelledOrders = currentOrders.length - active.length
  const revenue = sumOrderTotals(active)
  const orders = active.length
  const averageOrderValue = orders > 0 ? revenue / orders : 0

  const previousActive = previousOrdersRows.filter(
    (order) => order.order_status !== 'cancelled',
  )
  const previousOrders = previousActive.length
  const previousRevenue = sumOrderTotals(previousActive)

  const statusCounts: Partial<Record<OrderStatus, number>> = {}
  let deliveryOrders = 0
  let pickupOrders = 0
  let phoneOrders = 0
  let appOrders = 0

  for (const order of currentOrders) {
    statusCounts[order.order_status] =
      (statusCounts[order.order_status] ?? 0) + 1
    if (order.order_status === 'cancelled') continue
    if (order.fulfillment_type === 'pickup') pickupOrders += 1
    else deliveryOrders += 1
    if (order.order_source === 'phone') phoneOrders += 1
    else appOrders += 1
  }

  const delivered = statusCounts.delivered ?? 0
  const completionRate =
    orders > 0 ? (delivered / Math.max(orders, 1)) * 100 : 0

  const dailyTrend = buildDailyTrendForRange(active, range.fromDate, range.toDate)
  const peakDay =
    [...dailyTrend].sort(
      (a, b) => b.orders - a.orders || b.revenue - a.revenue,
    )[0] ?? null

  const ordersChangePct = percentChange(orders, previousOrders)
  const revenueChangePct = percentChange(revenue, previousRevenue)

  const overview: DashboardRangeOverview = {
    range,
    previousLabel: formatRangeLabel(previous.fromDate, previous.toDate),
    orders,
    revenue,
    averageOrderValue,
    cancelledOrders,
    completionRate,
    previousOrders,
    previousRevenue,
    ordersChangePct,
    revenueChangePct,
    deliveryOrders,
    pickupOrders,
    phoneOrders,
    appOrders,
    statusCounts,
    dailyTrend,
    popularDishes: popularResult.data,
    newCustomers: customerCounts.newCustomers,
    totalCustomers: customerCounts.totalCustomers,
    peakDay: peakDay && peakDay.orders > 0 ? peakDay : null,
    insights: buildDashboardInsights({
      range,
      orders: currentOrders.length,
      revenue,
      averageOrderValue,
      cancelledOrders,
      completionRate,
      ordersChangePct,
      revenueChangePct,
      deliveryOrders,
      pickupOrders,
      phoneOrders,
      popularDish: popularResult.data[0] ?? null,
      peakDay: peakDay && peakDay.orders > 0 ? peakDay : null,
      newCustomers: customerCounts.newCustomers,
    }),
  }

  return createSuccessResponse(overview)
}
