import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type {
  DeliveryPartner,
  DeliveryPartnerFormInput,
} from '@/types/DeliveryPartner'
import { getCurrentOrganizationId } from '@/services/currentOrganization'
import { supabase } from '@/services/supabaseClient'
import { normalizeIndianPhone } from '@/utils/phone'
import { isValidEmail, isValidPassword } from '@/utils/validation'

function mapDeliveryPartner(row: Record<string, unknown>): DeliveryPartner {
  return {
    id: row.id as string,
    organization_id: (row.organization_id as string) ?? '',
    branch_id: (row.branch_id as string | null) ?? null,
    full_name: row.full_name as string,
    phone: row.phone as string,
    is_active: Boolean(row.is_active),
    notes: (row.notes as string | null) ?? null,
    user_id: (row.user_id as string | null) ?? null,
    login_email: (row.login_email as string | null) ?? null,
    login_active:
      row.login_active == null ? null : Boolean(row.login_active),
    has_login: Boolean(row.has_login ?? row.user_id),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

async function invokeAdminDeliveryPartner<T>(
  body: Record<string, unknown>,
): Promise<ServiceResponse<T>> {
  const organizationId = getCurrentOrganizationId()
  const { data, error } = await supabase.functions.invoke<{
    data?: T
    error?: string
  }>('admin-delivery-partner', {
    body: { ...body, organizationId },
  })

  if (error) {
    return createErrorResponse(
      error.message || 'Unable to manage delivery partners.',
      error.message,
    )
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return createErrorResponse(String(data.error))
  }

  return createSuccessResponse(data?.data as T)
}

export async function getDeliveryPartners(): Promise<
  ServiceResponse<DeliveryPartner[]>
> {
  const viaFunction = await invokeAdminDeliveryPartner<DeliveryPartner[]>({
    action: 'list',
  })
  if (viaFunction.success) {
    return createSuccessResponse(
      viaFunction.data.map((row) =>
        mapDeliveryPartner(row as unknown as Record<string, unknown>),
      ),
    )
  }

  // Fallback if the edge function is not deployed yet.
  const { data, error } = await supabase
    .from('delivery_partners')
    .select('*')
    .order('is_active', { ascending: false })
    .order('full_name', { ascending: true })

  if (error) {
    return createErrorResponse('Unable to load delivery partners.', error.message)
  }

  return createSuccessResponse(
    (data ?? []).map((row) =>
      mapDeliveryPartner({
        ...row,
        login_email: null,
        login_active: null,
        has_login: Boolean(row.user_id),
      }),
    ),
  )
}

export async function getActiveDeliveryPartners(
  branchId?: string | null,
): Promise<ServiceResponse<DeliveryPartner[]>> {
  let query = supabase
    .from('delivery_partners')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (branchId) {
    query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
  }

  const { data, error } = await query

  if (error) {
    return createErrorResponse('Unable to load delivery partners.', error.message)
  }

  return createSuccessResponse(
    (data ?? []).map((row) =>
      mapDeliveryPartner({
        ...row,
        login_email: null,
        login_active: null,
        has_login: Boolean(row.user_id),
      }),
    ),
  )
}

export async function createDeliveryPartner(
  input: DeliveryPartnerFormInput,
): Promise<ServiceResponse<DeliveryPartner>> {
  const name = input.fullName.trim()
  const phone = normalizeIndianPhone(input.phone)
  const email = input.email?.trim().toLowerCase() ?? ''
  const password = input.password ?? ''

  if (!name) return createErrorResponse('Partner name is required.')
  if (!phone) return createErrorResponse('Enter a valid 10-digit phone number.')
  if (!isValidEmail(email)) {
    return createErrorResponse('Enter a valid login email.')
  }
  if (!isValidPassword(password)) {
    return createErrorResponse('Password must be at least 6 characters.')
  }

  const result = await invokeAdminDeliveryPartner<Record<string, unknown>>({
    action: 'upsert',
    fullName: name,
    phone,
    notes: input.notes?.trim() || null,
    branchId: input.branchId ?? null,
    isActive: input.isActive ?? true,
    email,
    password,
  })

  if (!result.success) return result
  return createSuccessResponse(mapDeliveryPartner(result.data))
}

export async function updateDeliveryPartner(
  id: string,
  input: Partial<DeliveryPartnerFormInput>,
): Promise<ServiceResponse<DeliveryPartner>> {
  const payload: Record<string, unknown> = {
    action: 'upsert',
    partnerId: id,
  }

  if (input.fullName !== undefined) payload.fullName = input.fullName.trim()
  if (input.phone !== undefined) {
    const phone = normalizeIndianPhone(input.phone)
    if (!phone) return createErrorResponse('Enter a valid 10-digit phone number.')
    payload.phone = phone
  }
  if (input.notes !== undefined) payload.notes = input.notes.trim() || null
  if (input.isActive !== undefined) payload.isActive = input.isActive
  if (input.branchId !== undefined) payload.branchId = input.branchId
  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase()
    if (email && !isValidEmail(email)) {
      return createErrorResponse('Enter a valid login email.')
    }
    payload.email = email
  }
  if (input.password) {
    if (!isValidPassword(input.password)) {
      return createErrorResponse('Password must be at least 6 characters.')
    }
    payload.password = input.password
  }

  if (!payload.fullName || !payload.phone) {
    // Function requires name+phone on upsert; load current then merge if needed.
    const listed = await getDeliveryPartners()
    if (!listed.success) return listed
    const current = listed.data.find((partner) => partner.id === id)
    if (!current) return createErrorResponse('Delivery partner not found.')
    payload.fullName = payload.fullName ?? current.full_name
    payload.phone = payload.phone ?? current.phone
    if (payload.email === undefined && current.login_email) {
      payload.email = current.login_email
    }
    if (payload.notes === undefined) payload.notes = current.notes
    if (payload.branchId === undefined) payload.branchId = current.branch_id
    if (payload.isActive === undefined) payload.isActive = current.is_active
  }

  const result = await invokeAdminDeliveryPartner<Record<string, unknown>>(
    payload,
  )
  if (!result.success) return result
  return createSuccessResponse(mapDeliveryPartner(result.data))
}

export async function setDeliveryPartnerActive(
  id: string,
  isActive: boolean,
): Promise<ServiceResponse<DeliveryPartner>> {
  const result = await invokeAdminDeliveryPartner<Record<string, unknown>>({
    action: 'set_active',
    partnerId: id,
    isActive,
  })
  if (!result.success) return result
  return createSuccessResponse(mapDeliveryPartner(result.data))
}

export async function setDeliveryPartnerPassword(
  id: string,
  password: string,
): Promise<ServiceResponse<null>> {
  if (!isValidPassword(password)) {
    return createErrorResponse('Password must be at least 6 characters.')
  }

  const result = await invokeAdminDeliveryPartner<{ ok: boolean }>({
    action: 'set_password',
    partnerId: id,
    password,
  })
  if (!result.success) return result
  return createSuccessResponse(null)
}

export async function deleteDeliveryPartner(
  id: string,
): Promise<ServiceResponse<null>> {
  const result = await invokeAdminDeliveryPartner<{ ok: boolean }>({
    action: 'delete',
    partnerId: id,
    deleteLogin: true,
  })
  if (!result.success) return result
  return createSuccessResponse(null)
}

/** Suggested login email: {phone}@{tenant}.test */
export function suggestedDeliveryLoginEmail(
  phone: string,
  orgSlug: string | null | undefined,
): string {
  const digits = normalizeIndianPhone(phone)
  if (!digits) return ''
  const slug = (orgSlug ?? 'restaurant').trim().toLowerCase()
  const emailSlug =
    slug === 'thetasteofandhra' || slug === 'taste-of-andhra'
      ? 'tasteofandhra'
      : slug === 'chopsticksspicemalabar' || slug === 'spice-malabar'
        ? 'chopsticksspicemalabar'
        : slug.replace(/-/g, '')
  return `${digits}@${emailSlug}.test`
}
