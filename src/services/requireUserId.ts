import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import { supabase } from '@/services/supabaseClient'

export async function requireUserId(): Promise<ServiceResponse<string>> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return createErrorResponse('Please sign in to continue.')
  }

  return createSuccessResponse(user.id)
}
