import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type {
  DeliveryPartner,
  DeliveryPartnerFormInput,
} from '@/types/DeliveryPartner'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { supabase } from '@/services/supabaseClient'
import { normalizeIndianPhone } from '@/utils/phone'

function mapDeliveryPartner(row: Record<string, unknown>): DeliveryPartner {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    full_name: row.full_name as string,
    phone: row.phone as string,
    is_active: Boolean(row.is_active),
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function getDeliveryPartners(): Promise<
  ServiceResponse<DeliveryPartner[]>
> {
  const { data, error } = await supabase
    .from('delivery_partners')
    .select('*')
    .order('is_active', { ascending: false })
    .order('full_name', { ascending: true })

  if (error) {
    return createErrorResponse('Unable to load delivery partners.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapDeliveryPartner))
}

export async function getActiveDeliveryPartners(): Promise<
  ServiceResponse<DeliveryPartner[]>
> {
  const { data, error } = await supabase
    .from('delivery_partners')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error) {
    return createErrorResponse('Unable to load delivery partners.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapDeliveryPartner))
}

export async function createDeliveryPartner(
  input: DeliveryPartnerFormInput,
): Promise<ServiceResponse<DeliveryPartner>> {
  const name = input.fullName.trim()
  const phone = normalizeIndianPhone(input.phone)

  if (!name) {
    return createErrorResponse('Partner name is required.')
  }

  if (!phone) {
    return createErrorResponse('Enter a valid 10-digit phone number.')
  }

  const { data, error } = await supabase
    .from('delivery_partners')
    .insert({
      organization_id: DEFAULT_ORGANIZATION_ID,
      full_name: name,
      phone,
      notes: input.notes?.trim() || null,
      is_active: input.isActive ?? true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return createErrorResponse('A partner with this phone already exists.')
    }
    return createErrorResponse('Unable to add delivery partner.', error.message)
  }

  return createSuccessResponse(mapDeliveryPartner(data))
}

export async function updateDeliveryPartner(
  id: string,
  input: Partial<DeliveryPartnerFormInput>,
): Promise<ServiceResponse<DeliveryPartner>> {
  const updates: Record<string, unknown> = {}

  if (input.fullName !== undefined) {
    const name = input.fullName.trim()
    if (!name) return createErrorResponse('Partner name is required.')
    updates.full_name = name
  }

  if (input.phone !== undefined) {
    const phone = normalizeIndianPhone(input.phone)
    if (!phone) return createErrorResponse('Enter a valid 10-digit phone number.')
    updates.phone = phone
  }

  if (input.notes !== undefined) updates.notes = input.notes.trim() || null
  if (input.isActive !== undefined) updates.is_active = input.isActive

  const { data, error } = await supabase
    .from('delivery_partners')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return createErrorResponse('A partner with this phone already exists.')
    }
    return createErrorResponse('Unable to update delivery partner.', error.message)
  }

  return createSuccessResponse(mapDeliveryPartner(data))
}

export async function setDeliveryPartnerActive(
  id: string,
  isActive: boolean,
): Promise<ServiceResponse<DeliveryPartner>> {
  return updateDeliveryPartner(id, { isActive })
}

export async function deleteDeliveryPartner(
  id: string,
): Promise<ServiceResponse<null>> {
  const { error } = await supabase
    .from('delivery_partners')
    .delete()
    .eq('id', id)

  if (error) {
    return createErrorResponse('Unable to delete delivery partner.', error.message)
  }

  return createSuccessResponse(null)
}
