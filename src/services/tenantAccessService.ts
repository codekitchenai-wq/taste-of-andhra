import { evaluateTenantAccess, type TenantAccessResult } from '@/utils/tenantAccess'
import { supabase } from '@/services/supabaseClient'
import type { UserRole } from '@/types/enums'

export async function evaluateCurrentUserTenantAccess(
  userId: string,
  role: UserRole,
  organizationId: string,
): Promise<TenantAccessResult> {
  const [membersResult, customersResult] = await Promise.all([
    supabase
      .from('organization_members')
      .select('organization_id, is_active')
      .eq('user_id', userId),
    supabase
      .from('organization_customers')
      .select('organization_id')
      .eq('user_id', userId),
  ])

  const memberOrgIds = (membersResult.data ?? [])
    .filter((row) => row.is_active !== false)
    .map((row) => String(row.organization_id))

  const customerOrgIds = (customersResult.data ?? []).map((row) =>
    String(row.organization_id),
  )

  return evaluateTenantAccess({
    role,
    organizationId,
    memberOrgIds,
    customerOrgIds,
  })
}
