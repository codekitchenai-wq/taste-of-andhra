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

/** Attach this Google/email user as a customer of the current restaurant. */
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

  const { error } = await supabase.from('organization_customers').upsert(
    {
      organization_id: organizationId,
      user_id: user.id,
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
