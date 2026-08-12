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

/** Normalize Indian mobile input to 10-digit local form. */
export function normalizePhoneLocal(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2)
  }
  if (digits.length === 10) {
    return digits
  }
  return null
}

function phoneDigitsMatch(
  stored: string | null | undefined,
  local: string,
): boolean {
  const rowDigits = String(stored ?? '').replace(/\D/g, '')
  if (!rowDigits) return false

  const normalized =
    rowDigits.length === 12 && rowDigits.startsWith('91')
      ? rowDigits.slice(2)
      : rowDigits.length > 10
        ? rowDigits.slice(-10)
        : rowDigits

  return normalized === local
}

export interface PhoneOrderGuestAddress {
  line1: string
  line2: string
  landmark: string
  city: string
  state: string
  pincode: string
}

export interface PhoneOrderCustomerLookup {
  profile: Profile | null
  customerName: string
  addresses: Address[]
  guestAddress: PhoneOrderGuestAddress | null
  source: 'profile' | 'address' | 'guest_order'
}

async function findProfileByPhoneLocal(
  local: string,
): Promise<Profile | null> {
  const variants = [local, `+91${local}`, `91${local}`]

  for (const variant of variants) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .eq('phone', variant)
      .limit(1)
      .maybeSingle()

    if (error) continue
    if (data) return mapProfile(data)
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .not('phone', 'is', null)
    .limit(200)

  if (error) return null

  const match =
    (data ?? []).find((row) => phoneDigitsMatch(row.phone as string, local)) ??
    null

  return match ? mapProfile(match) : null
}

async function findProfileById(profileId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .eq('role', 'customer')
    .maybeSingle()

  if (error || !data) return null
  return mapProfile(data)
}

function guestAddressFromOrder(row: Record<string, unknown>): PhoneOrderGuestAddress | null {
  const line1 = String(row.guest_address_line1 ?? '').trim()
  const pincode = String(row.guest_pincode ?? '').trim()
  if (!line1 || !/^\d{6}$/.test(pincode)) return null

  return {
    line1,
    line2: String(row.guest_address_line2 ?? '').trim(),
    landmark: String(row.guest_landmark ?? '').trim(),
    city: String(row.guest_city ?? '').trim() || 'Bangalore',
    state: String(row.guest_state ?? '').trim() || 'Karnataka',
    pincode,
  }
}

/** Staff phone-order lookup: profile, saved address phone, or prior guest orders. */
export async function lookupCustomerForPhoneOrder(
  phone: string,
): Promise<ServiceResponse<PhoneOrderCustomerLookup | null>> {
  const local = normalizePhoneLocal(phone)
  if (!local) {
    return createErrorResponse('Enter a valid 10-digit phone number.')
  }

  const profile = await findProfileByPhoneLocal(local)
  if (profile) {
    const addressResult = await getCustomerAddresses(profile.id)
    return createSuccessResponse({
      profile,
      customerName: profile.full_name,
      addresses: addressResult.success ? addressResult.data : [],
      guestAddress: null,
      source: 'profile',
    })
  }

  const { data: addressRows, error: addressError } = await supabase
    .from('addresses')
    .select('*, profiles!inner(*)')
    .or(`phone.eq.${local},phone.eq.+91${local},phone.eq.91${local}`)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!addressError && addressRows?.length) {
    const addressMatch =
      addressRows.find((row) =>
        phoneDigitsMatch(row.phone as string, local),
      ) ?? addressRows[0]

    if (addressMatch) {
      const linkedProfile = mapProfile(
        addressMatch.profiles as Record<string, unknown>,
      )
      const addressResult = await getCustomerAddresses(linkedProfile.id)
      const addresses = addressResult.success ? addressResult.data : []

      return createSuccessResponse({
        profile: linkedProfile,
        customerName: linkedProfile.full_name,
        addresses,
        guestAddress: null,
        source: 'address',
      })
    }
  }

  const { data: orderRows, error: orderError } = await supabase
    .from('orders')
    .select(
      `
      guest_name,
      guest_phone,
      user_id,
      address_id,
      guest_address_line1,
      guest_address_line2,
      guest_landmark,
      guest_city,
      guest_state,
      guest_pincode,
      created_at
    `,
    )
    .not('guest_phone', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (orderError) {
    return createErrorResponse('Unable to look up customer.', orderError.message)
  }

  const orderMatch =
    (orderRows ?? []).find((row) =>
      phoneDigitsMatch(row.guest_phone as string, local),
    ) ?? null

  if (!orderMatch) {
    return createSuccessResponse(null)
  }

  const customerName =
    String(orderMatch.guest_name ?? '').trim() || 'Customer'

  let linkedProfile: Profile | null = null
  let addresses: Address[] = []
  let guestAddress = guestAddressFromOrder(
    orderMatch as Record<string, unknown>,
  )

  if (orderMatch.user_id) {
    linkedProfile = await findProfileById(orderMatch.user_id as string)
    if (linkedProfile) {
      const addressResult = await getCustomerAddresses(linkedProfile.id)
      if (addressResult.success) {
        addresses = addressResult.data
      }
    }
  }

  if (orderMatch.address_id && linkedProfile) {
    const { data: savedAddress } = await supabase
      .from('addresses')
      .select('*')
      .eq('id', orderMatch.address_id as string)
      .maybeSingle()

    if (savedAddress) {
      const mapped = mapAddress(savedAddress)
      if (!addresses.some((address) => address.id === mapped.id)) {
        addresses = [mapped, ...addresses]
      }
    }
  }

  return createSuccessResponse({
    profile: linkedProfile,
    customerName: linkedProfile?.full_name ?? customerName,
    addresses,
    guestAddress: addresses.length > 0 ? null : guestAddress,
    source: 'guest_order',
  })
}

/** Digits-only match against profile phone (supports +91 / spaced storage). */
export async function findCustomerByPhone(
  phone: string,
): Promise<ServiceResponse<Profile | null>> {
  const local = normalizePhoneLocal(phone)
  if (!local) {
    return createErrorResponse('Enter a valid 10-digit phone number.')
  }

  const profile = await findProfileByPhoneLocal(local)
  return createSuccessResponse(profile)
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
