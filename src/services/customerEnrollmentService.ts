import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import { UNMATCHED_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { getCurrentOrganizationId } from '@/services/currentOrganization'
import { supabase } from '@/services/supabaseClient'
import {
  isMissingColumnError,
  isMissingRelationError,
} from '@/utils/supabaseSchema'

function captureFromAuthUser(user: {
  email?: string | null
  user_metadata?: Record<string, unknown>
}): {
  full_name: string | null
  email: string | null
  phone: string | null
} {
  const metadata = user.user_metadata ?? {}
  const fullName =
    (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
    (typeof metadata.name === 'string' && metadata.name.trim()) ||
    null
  const phone =
    typeof metadata.phone === 'string' && metadata.phone.trim()
      ? metadata.phone.trim()
      : null
  const email = user.email?.trim().toLowerCase() || null

  return { full_name: fullName, email, phone }
}

/** Attach this user as a customer of the current restaurant with tenant-local contact capture. */
export async function enrollCurrentCustomer(
  organizationId: string = getCurrentOrganizationId(),
): Promise<ServiceResponse<boolean>> {
  if (!organizationId || organizationId === UNMATCHED_ORGANIZATION_ID) {
    return createSuccessResponse(false)
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return createSuccessResponse(false)
  }

  const [{ data: existingRow }, { data: existingMembers }] = await Promise.all([
    supabase
      .from('organization_customers')
      .select('organization_id, full_name, phone, email')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .maybeSingle(),
    supabase
      .from('organization_members')
      .select('organization_id, is_active')
      .eq('user_id', user.id),
  ])

  if (existingRow) {
    return createSuccessResponse(true)
  }

  const staffElsewhere = (existingMembers ?? []).some(
    (row) => row.is_active !== false,
  )
  if (staffElsewhere) {
    return createSuccessResponse(false)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, email')
    .eq('id', user.id)
    .maybeSingle()

  const fromAuth = captureFromAuthUser(user)

  const { error } = await supabase.from('organization_customers').upsert(
    {
      organization_id: organizationId,
      user_id: user.id,
      full_name: profile?.full_name?.trim() || fromAuth.full_name,
      phone: profile?.phone?.trim() || fromAuth.phone,
      email: profile?.email?.trim() || fromAuth.email,
    },
    { onConflict: 'organization_id,user_id', ignoreDuplicates: true },
  )

  if (
    error &&
    !isMissingColumnError(error.message) &&
    !isMissingRelationError(error.message) &&
    !error.message.toLowerCase().includes('organization_customers')
  ) {
    return createErrorResponse(
      'Unable to register you at this restaurant.',
      error.message,
    )
  }

  return createSuccessResponse(true)
}
