import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Address } from '@/types/Address'
import type { Profile } from '@/types/Profile'
import { supabase } from '@/services/supabaseClient'
import { mapAddress } from '@/utils/mapAddress'
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

/** Digits-only match against profile phone (supports +91 / spaced storage). */
export async function findCustomerByPhone(
  phone: string,
): Promise<ServiceResponse<Profile | null>> {
  const digits = phone.replace(/\D/g, '')
  const local =
    digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits.length === 10
        ? digits
        : ''

  if (!local) {
    return createErrorResponse('Enter a valid 10-digit phone number.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .or(`phone.eq.${local},phone.eq.+91${local},phone.ilike.%${local}`)
    .limit(5)

  if (error) {
    return createErrorResponse('Unable to look up customer.', error.message)
  }

  const match =
    (data ?? []).find((row) => {
      const rowDigits = String(row.phone ?? '').replace(/\D/g, '')
      return rowDigits === local || rowDigits.endsWith(local)
    }) ?? null

  return createSuccessResponse(match ? mapProfile(match) : null)
}

export async function getCustomerAddresses(
  customerId: string,
): Promise<ServiceResponse<Address[]>> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', customerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return createErrorResponse(
      'Unable to load customer addresses.',
      error.message,
    )
  }

  return createSuccessResponse((data ?? []).map(mapAddress))
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

export async function updateCustomerName(
  customerId: string,
  fullName: string,
): Promise<ServiceResponse<Profile>> {
  const name = fullName.trim()
  if (!name) {
    return createErrorResponse('Customer name is required.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: name })
    .eq('id', customerId)
    .eq('role', 'customer')
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to update customer.', error.message)
  }

  return createSuccessResponse(mapProfile(data))
}

export interface StaffAddressInput {
  fullName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  landmark?: string
  city: string
  state: string
  pincode: string
}

/** Admin / staff can attach an address to a known customer profile. */
export async function addAddressForCustomer(
  customerId: string,
  input: StaffAddressInput,
): Promise<ServiceResponse<Address>> {
  if (!input.fullName.trim()) {
    return createErrorResponse('Customer name is required.')
  }
  if (!input.addressLine1.trim()) {
    return createErrorResponse('Address line 1 is required.')
  }
  if (!/^\d{6}$/.test(input.pincode.trim())) {
    return createErrorResponse('Enter a valid 6-digit pincode.')
  }
  if (!input.city.trim()) {
    return createErrorResponse('City is required.')
  }
  if (!input.state.trim()) {
    return createErrorResponse('State is required.')
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert({
      user_id: customerId,
      address_type: 'other',
      full_name: input.fullName.trim(),
      phone: input.phone.trim(),
      address_line1: input.addressLine1.trim(),
      address_line2: input.addressLine2?.trim() || null,
      landmark: input.landmark?.trim() || null,
      city: input.city.trim(),
      state: input.state.trim(),
      pincode: input.pincode.trim(),
      is_default: false,
    })
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to save address.', error.message)
  }

  return createSuccessResponse(mapAddress(data))
}
