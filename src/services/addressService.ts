import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Address } from '@/types/Address'
import { UNMATCHED_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { getCurrentOrganizationId } from '@/services/currentOrganization'
import { supabase } from '@/services/supabaseClient'
import { insertWithOrgFallback } from '@/utils/insertWithOrgFallback'
import { mapAddress } from '@/utils/mapAddress'
import { isMissingColumnError } from '@/utils/supabaseSchema'
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
  distanceKm?: number | null
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

function validateAddressInput(
  input: CreateAddressInput,
  mode: 'strict' | 'relaxed' = 'strict',
): string | null {
  if (mode === 'relaxed') {
    // Optional fields — only validate format when the customer typed something.
    if (input.phone.trim() && !isValidPhone(input.phone)) {
      return 'Enter a valid 10-digit phone number.'
    }
    if (input.pincode.trim() && !/^\d{6}$/.test(input.pincode.trim())) {
      return 'Enter a valid 6-digit pincode.'
    }
    return null
  }

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
  let query = supabase
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true)

  const orgId = getCurrentOrganizationId()
  if (orgId && orgId !== UNMATCHED_ORGANIZATION_ID) {
    query = query.eq('organization_id', orgId)
  }

  await query
}

export async function getAddresses(): Promise<ServiceResponse<Address[]>> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const userId = userResult.data
  const orgId = getCurrentOrganizationId()
  if (!orgId || orgId === UNMATCHED_ORGANIZATION_ID) {
    return createSuccessResponse([])
  }

  let query = supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  let { data, error } = await query

  if (error && isMissingColumnError(error.message)) {
    const fallback = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    return createErrorResponse('Unable to load addresses.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapAddress))
}

export async function addAddress(
  input: CreateAddressInput,
  options?: { validationMode?: 'strict' | 'relaxed' },
): Promise<ServiceResponse<Address>> {
  const validationMode = options?.validationMode ?? 'strict'
  const validationError = validateAddressInput(input, validationMode)

  if (validationError) {
    return createErrorResponse(validationError)
  }

  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const userId = userResult.data
  const orgId = getCurrentOrganizationId()
  if (!orgId || orgId === UNMATCHED_ORGANIZATION_ID) {
    return createErrorResponse('Restaurant is not ready. Refresh and try again.')
  }

  const shouldBeDefault = input.isDefault ?? false

  let countQuery = supabase
    .from('addresses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('organization_id', orgId)

  let { count, error: countError } = await countQuery
  if (countError && isMissingColumnError(countError.message)) {
    const fallback = await supabase
      .from('addresses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    count = fallback.count
  }

  const isDefault = shouldBeDefault || (count ?? 0) === 0

  if (isDefault) {
    await clearDefaultAddresses(userId)
  }

  const { data, error } = await insertWithOrgFallback(supabase, 'addresses', {
    user_id: userId,
    organization_id: orgId,
    address_type: input.addressType.trim() || 'home',
    // DB columns are NOT NULL — empty string is allowed when validation is relaxed.
    full_name: input.fullName.trim() || (validationMode === 'relaxed' ? 'Customer' : ''),
    phone: input.phone.trim() || (validationMode === 'relaxed' ? '' : ''),
    address_line1:
      input.addressLine1.trim() ||
      (validationMode === 'relaxed' ? 'Location pin' : ''),
    address_line2: input.addressLine2?.trim() || null,
    landmark: input.landmark?.trim() || null,
    city: input.city.trim() || (validationMode === 'relaxed' ? '' : ''),
    state: input.state.trim() || (validationMode === 'relaxed' ? '' : ''),
    pincode: input.pincode.trim() || (validationMode === 'relaxed' ? '' : ''),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    distance_km: input.distanceKm ?? null,
    is_default: isDefault,
  })

  if (error || !data) {
    return createErrorResponse('Unable to save address.', error?.message)
  }

  return createSuccessResponse(mapAddress(data))
}

export async function updateAddress(
  id: string,
  input: Partial<CreateAddressInput>,
  options?: { validationMode?: 'strict' | 'relaxed' },
): Promise<ServiceResponse<Address>> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  const relaxed = options?.validationMode === 'relaxed'
  const updates: Record<string, unknown> = {}

  if (input.addressType !== undefined) {
    updates.address_type = input.addressType.trim() || 'home'
  }

  if (input.fullName !== undefined) {
    updates.full_name = input.fullName.trim() || (relaxed ? 'Customer' : '')
  }

  if (input.phone !== undefined) {
    if (input.phone.trim() && !isValidPhone(input.phone)) {
      return createErrorResponse('Enter a valid 10-digit phone number.')
    }
    if (!relaxed && !isValidPhone(input.phone)) {
      return createErrorResponse('Enter a valid 10-digit phone number.')
    }

    updates.phone = input.phone.trim()
  }

  if (input.addressLine1 !== undefined) {
    updates.address_line1 =
      input.addressLine1.trim() || (relaxed ? 'Location pin' : '')
  }

  if (input.addressLine2 !== undefined) {
    updates.address_line2 = input.addressLine2.trim() || null
  }

  if (input.landmark !== undefined) {
    if (!relaxed && !input.landmark.trim()) {
      return createErrorResponse('Nearest landmark is required.')
    }

    updates.landmark = input.landmark.trim() || null
  }

  if (input.city !== undefined) {
    updates.city = input.city.trim()
  }

  if (input.state !== undefined) {
    updates.state = input.state.trim()
  }

  if (input.pincode !== undefined) {
    if (
      input.pincode.trim() &&
      !/^\d{6}$/.test(input.pincode.trim())
    ) {
      return createErrorResponse('Enter a valid 6-digit pincode.')
    }
    if (!relaxed && !/^\d{6}$/.test(input.pincode.trim())) {
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

  if (input.distanceKm !== undefined) {
    updates.distance_km = input.distanceKm ?? null
  }

  if (input.isDefault !== undefined && input.isDefault) {
    await clearDefaultAddresses(userResult.data)
    updates.is_default = true
  }

  if (Object.keys(updates).length === 0) {
    return createErrorResponse('No changes provided.')
  }

  const userId = userResult.data
  const orgId = getCurrentOrganizationId()

  let query = supabase
    .from('addresses')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)

  if (orgId && orgId !== UNMATCHED_ORGANIZATION_ID) {
    query = query.eq('organization_id', orgId)
  }

  let { data, error } = await query.select().single()

  if (error && isMissingColumnError(error.message)) {
    const fallback = await supabase
      .from('addresses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    data = fallback.data
    error = fallback.error
  }

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

  const userId = userResult.data
  const orgId = getCurrentOrganizationId()

  let query = supabase.from('addresses').delete().eq('id', id).eq('user_id', userId)

  if (orgId && orgId !== UNMATCHED_ORGANIZATION_ID) {
    query = query.eq('organization_id', orgId)
  }

  let { error } = await query

  if (error && isMissingColumnError(error.message)) {
    const fallback = await supabase
      .from('addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    error = fallback.error
  }

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
