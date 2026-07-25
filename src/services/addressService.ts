import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Address } from '@/types/Address'
import { supabase } from '@/services/supabaseClient'
import { mapAddress } from '@/utils/mapAddress'
import { isValidPhone } from '@/utils/validation'

export interface CreateAddressInput {
  addressType: string
  fullName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  landmark?: string
  city: string
  state: string
  pincode: string
  latitude?: number | null
  longitude?: number | null
  isDefault?: boolean
}

async function requireUserId(): Promise<ServiceResponse<string>> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return createErrorResponse('Unable to verify your session.', error.message)
  }

  if (!user) {
    return createErrorResponse('Please sign in to manage addresses.')
  }

  return createSuccessResponse(user.id)
}

function validateAddressInput(input: CreateAddressInput): string | null {
  if (!input.fullName.trim()) return 'Full name is required.'
  if (!isValidPhone(input.phone)) return 'Enter a valid 10-digit phone number.'
  if (!input.addressLine1.trim()) return 'Address line is required.'
  if (!input.landmark?.trim()) return 'Nearest landmark is required.'
  if (!input.city.trim()) return 'City is required.'
  if (!input.state.trim()) return 'State is required.'
  if (!/^\d{6}$/.test(input.pincode.trim())) {
    return 'Enter a valid 6-digit pincode.'
  }

  return null
}

async function clearDefaultAddresses(userId: string): Promise<void> {
  await supabase
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true)
}

export async function getAddresses(): Promise<ServiceResponse<Address[]>> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userResult.data)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return createErrorResponse('Unable to load addresses.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapAddress))
}

export async function addAddress(
  input: CreateAddressInput,
): Promise<ServiceResponse<Address>> {
  const validationError = validateAddressInput(input)

  if (validationError) {
    return createErrorResponse(validationError)
  }

  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const userId = userResult.data
  const shouldBeDefault = input.isDefault ?? false

  const { count } = await supabase
    .from('addresses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const isDefault = shouldBeDefault || (count ?? 0) === 0

  if (isDefault) {
    await clearDefaultAddresses(userId)
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert({
      user_id: userId,
      address_type: input.addressType.trim() || 'home',
      full_name: input.fullName.trim(),
      phone: input.phone.trim(),
      address_line1: input.addressLine1.trim(),
      address_line2: input.addressLine2?.trim() || null,
      landmark: input.landmark?.trim() || null,
      city: input.city.trim(),
      state: input.state.trim(),
      pincode: input.pincode.trim(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      is_default: isDefault,
    })
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to save address.', error.message)
  }

  return createSuccessResponse(mapAddress(data))
}

export async function updateAddress(
  id: string,
  input: Partial<CreateAddressInput>,
): Promise<ServiceResponse<Address>> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const updates: Record<string, unknown> = {}

  if (input.addressType !== undefined) {
    updates.address_type = input.addressType.trim() || 'home'
  }

  if (input.fullName !== undefined) {
    updates.full_name = input.fullName.trim()
  }

  if (input.phone !== undefined) {
    if (!isValidPhone(input.phone)) {
      return createErrorResponse('Enter a valid 10-digit phone number.')
    }

    updates.phone = input.phone.trim()
  }

  if (input.addressLine1 !== undefined) {
    updates.address_line1 = input.addressLine1.trim()
  }

  if (input.addressLine2 !== undefined) {
    updates.address_line2 = input.addressLine2.trim() || null
  }

  if (input.landmark !== undefined) {
    if (!input.landmark.trim()) {
      return createErrorResponse('Nearest landmark is required.')
    }

    updates.landmark = input.landmark.trim()
  }

  if (input.city !== undefined) {
    updates.city = input.city.trim()
  }

  if (input.state !== undefined) {
    updates.state = input.state.trim()
  }

  if (input.pincode !== undefined) {
    if (!/^\d{6}$/.test(input.pincode.trim())) {
      return createErrorResponse('Enter a valid 6-digit pincode.')
    }

    updates.pincode = input.pincode.trim()
  }

  if (input.latitude !== undefined) {
    updates.latitude = input.latitude
  }

  if (input.longitude !== undefined) {
    updates.longitude = input.longitude
  }

  if (input.isDefault !== undefined && input.isDefault) {
    await clearDefaultAddresses(userResult.data)
    updates.is_default = true
  }

  if (Object.keys(updates).length === 0) {
    return createErrorResponse('No changes provided.')
  }

  const { data, error } = await supabase
    .from('addresses')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userResult.data)
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to update address.', error.message)
  }

  return createSuccessResponse(mapAddress(data))
}

export async function deleteAddress(
  id: string,
): Promise<ServiceResponse<null>> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', userResult.data)

  if (error) {
    return createErrorResponse('Unable to delete address.', error.message)
  }

  return createSuccessResponse(null)
}

export async function setDefaultAddress(
  id: string,
): Promise<ServiceResponse<Address>> {
  return updateAddress(id, { isDefault: true })
}
