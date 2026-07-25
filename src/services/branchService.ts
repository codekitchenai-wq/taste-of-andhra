import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Branch, BranchFormInput } from '@/types/Branch'
import { supabase } from '@/services/supabaseClient'
import { formatBranchAddress, mapBranch } from '@/utils/mapBranch'

export async function getActiveBranches(): Promise<ServiceResponse<Branch[]>> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    return createErrorResponse('Unable to load branches.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapBranch))
}

export async function getAllBranches(): Promise<ServiceResponse<Branch[]>> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    return createErrorResponse('Unable to load branches.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapBranch))
}

export async function getDefaultBranch(): Promise<ServiceResponse<Branch>> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('is_default', true)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load default branch.', error.message)
  }

  if (data) {
    return createSuccessResponse(mapBranch(data))
  }

  const fallback = await getActiveBranches()
  if (!fallback.success) return fallback
  if (fallback.data.length === 0) {
    return createErrorResponse('No active branches configured.')
  }

  return createSuccessResponse(fallback.data[0]!)
}

export async function getBranchBySlug(
  slug: string,
): Promise<ServiceResponse<Branch>> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load branch.', error.message)
  }

  if (!data) {
    return createErrorResponse('Branch not found.')
  }

  return createSuccessResponse(mapBranch(data))
}

export async function getBranchById(
  id: string,
): Promise<ServiceResponse<Branch>> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load branch.', error.message)
  }

  if (!data) {
    return createErrorResponse('Branch not found.')
  }

  return createSuccessResponse(mapBranch(data))
}

export async function createBranch(
  input: BranchFormInput,
): Promise<ServiceResponse<Branch>> {
  if (input.isDefault) {
    await supabase.from('branches').update({ is_default: false }).eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('branches')
    .insert({
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address_line1: input.addressLine1.trim(),
      address_line2: input.addressLine2?.trim() || null,
      city: input.city.trim(),
      state: input.state.trim(),
      pincode: input.pincode.trim(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      gstin: input.gstin?.trim() || null,
      is_active: input.isActive ?? true,
      is_default: input.isDefault ?? false,
      opening_hours: input.openingHours?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to create branch.', error.message)
  }

  return createSuccessResponse(mapBranch(data))
}

export async function updateBranch(
  id: string,
  input: Partial<BranchFormInput>,
): Promise<ServiceResponse<Branch>> {
  if (input.isDefault) {
    await supabase
      .from('branches')
      .update({ is_default: false })
      .eq('is_default', true)
      .neq('id', id)
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.slug !== undefined) updates.slug = input.slug.trim().toLowerCase()
  if (input.phone !== undefined) updates.phone = input.phone.trim() || null
  if (input.email !== undefined) updates.email = input.email.trim() || null
  if (input.addressLine1 !== undefined) {
    updates.address_line1 = input.addressLine1.trim()
  }
  if (input.addressLine2 !== undefined) {
    updates.address_line2 = input.addressLine2.trim() || null
  }
  if (input.city !== undefined) updates.city = input.city.trim()
  if (input.state !== undefined) updates.state = input.state.trim()
  if (input.pincode !== undefined) updates.pincode = input.pincode.trim()
  if (input.latitude !== undefined) updates.latitude = input.latitude
  if (input.longitude !== undefined) updates.longitude = input.longitude
  if (input.gstin !== undefined) updates.gstin = input.gstin.trim() || null
  if (input.isActive !== undefined) updates.is_active = input.isActive
  if (input.isDefault !== undefined) updates.is_default = input.isDefault
  if (input.openingHours !== undefined) {
    updates.opening_hours = input.openingHours.trim() || null
  }

  const { data, error } = await supabase
    .from('branches')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to update branch.', error.message)
  }

  return createSuccessResponse(mapBranch(data))
}

export { formatBranchAddress }
