import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Profile } from '@/types/Profile'
import { supabase } from '@/services/supabaseClient'
import { mapProfile } from '@/utils/mapProfile'

export interface CustomerSearchParams {
  search?: string
  page?: number
  limit?: number
}

export interface CustomerDetails extends Profile {
  totalSpend: number
  orderCount: number
}

export async function getCustomers(
  params?: CustomerSearchParams,
): Promise<ServiceResponse<Profile[]>> {
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  if (params?.search?.trim()) {
    const term = params.search.trim()

    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    )
  }

  if (params?.limit) {
    query = query.limit(params.limit)
  }

  const { data, error } = await query

  if (error) {
    return createErrorResponse('Unable to load customers.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapProfile))
}

export async function getCustomerDetails(
  customerId: string,
): Promise<ServiceResponse<CustomerDetails>> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', customerId)
    .eq('role', 'customer')
    .maybeSingle()

  if (profileError) {
    return createErrorResponse('Unable to load customer.', profileError.message)
  }

  if (!profile) {
    return createErrorResponse('Customer not found.')
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('total')
    .eq('user_id', customerId)
    .neq('order_status', 'cancelled')

  if (ordersError) {
    return createErrorResponse('Unable to load customer orders.', ordersError.message)
  }

  const orderCount = orders?.length ?? 0
  const totalSpend =
    orders?.reduce((sum, order) => sum + Number(order.total), 0) ?? 0

  return createSuccessResponse({
    ...mapProfile(profile),
    totalSpend,
    orderCount,
  })
}

export async function getCustomerCount(): Promise<ServiceResponse<number>> {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer')

  if (error) {
    return createErrorResponse('Unable to count customers.', error.message)
  }

  return createSuccessResponse(count ?? 0)
}

export async function setCustomerActive(
  customerId: string,
  isActive: boolean,
): Promise<ServiceResponse<Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', customerId)
    .eq('role', 'customer')
    .select()
    .single()

  if (error) {
    return createErrorResponse(
      'Unable to update customer status.',
      error.message,
    )
  }

  return createSuccessResponse(mapProfile(data))
}
