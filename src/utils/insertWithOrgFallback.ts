import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import {
  isMissingColumnError,
  withoutOrganizationId,
} from '@/utils/supabaseSchema'

type InsertResult = {
  data: Record<string, unknown> | null
  error: PostgrestError | null
}

/**
 * Inserts a row; if organization_id is not in the live schema yet, retries without it.
 */
export async function insertWithOrgFallback(
  client: SupabaseClient,
  table: string,
  payload: Record<string, unknown>,
): Promise<InsertResult> {
  const first = await client.from(table).insert(payload).select().single()

  if (
    !first.error ||
    !isMissingColumnError(first.error.message) ||
    !first.error.message.toLowerCase().includes('organization_id')
  ) {
    return {
      data: (first.data as Record<string, unknown> | null) ?? null,
      error: first.error,
    }
  }

  const retry = await client
    .from(table)
    .insert(withoutOrganizationId(payload) as Record<string, unknown>)
    .select()
    .single()

  return {
    data: (retry.data as Record<string, unknown> | null) ?? null,
    error: retry.error,
  }
}
