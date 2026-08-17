import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { SubscriptionStatus } from '@/types/Organization'
import { supabase } from '@/services/supabaseClient'

export interface PlanSummary {
  id: string
  code: string
  name: string
  description: string | null
  price_monthly: number
  price_yearly: number
  is_active: boolean
}

export interface OrgSubscriptionView {
  id: string
  organization_id: string
  plan_id: string
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  provider: string | null
  provider_ref: string | null
  plan: PlanSummary | null
}

export interface UpdateOrgSubscriptionInput {
  planId: string
  status: SubscriptionStatus
  currentPeriodEnd: string
  providerRef?: string | null
}

function mapPlan(row: Record<string, unknown>): PlanSummary {
  return {
    id: String(row.id ?? ''),
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    description: (row.description as string | null) ?? null,
    price_monthly: Number(row.price_monthly ?? 0),
    price_yearly: Number(row.price_yearly ?? 0),
    is_active: Boolean(row.is_active),
  }
}

function mapSubscription(row: Record<string, unknown>): OrgSubscriptionView {
  const planRaw = row.plans as Record<string, unknown> | null | undefined
  return {
    id: String(row.id ?? ''),
    organization_id: String(row.organization_id ?? ''),
    plan_id: String(row.plan_id ?? ''),
    status: (row.status as SubscriptionStatus) ?? 'active',
    current_period_start: String(row.current_period_start ?? ''),
    current_period_end: String(row.current_period_end ?? ''),
    provider: (row.provider as string | null) ?? null,
    provider_ref: (row.provider_ref as string | null) ?? null,
    plan: planRaw ? mapPlan(planRaw) : null,
  }
}

export async function listActivePlans(): Promise<ServiceResponse<PlanSummary[]>> {
  const { data, error } = await supabase
    .from('plans')
    .select('id, code, name, description, price_monthly, price_yearly, is_active')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true })

  if (error) {
    return createErrorResponse('Unable to load plans.', error.message)
  }

  return createSuccessResponse(
    (data ?? []).map((row) => mapPlan(row as Record<string, unknown>)),
  )
}

export async function getOrgSubscription(
  organizationId: string,
): Promise<ServiceResponse<OrgSubscriptionView | null>> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'id, organization_id, plan_id, status, current_period_start, current_period_end, provider, provider_ref, plans(id, code, name, description, price_monthly, price_yearly, is_active)',
    )
    .eq('organization_id', organizationId)
    .in('status', ['trialing', 'active', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load subscription.', error.message)
  }

  if (!data) {
    return createSuccessResponse(null)
  }

  return createSuccessResponse(mapSubscription(data as Record<string, unknown>))
}

/**
 * Creates or updates the org's current subscription (Master only via RLS).
 * Cancels other non-terminal rows so one active subscription remains.
 */
export async function upsertOrgSubscription(
  organizationId: string,
  input: UpdateOrgSubscriptionInput,
): Promise<ServiceResponse<OrgSubscriptionView>> {
  const periodEnd = new Date(input.currentPeriodEnd)
  if (Number.isNaN(periodEnd.getTime())) {
    return createErrorResponse('Invalid period end date.')
  }

  const nowIso = new Date().toISOString()
  const periodEndIso = periodEnd.toISOString()

  const existing = await getOrgSubscription(organizationId)
  if (!existing.success) return existing

  if (existing.data) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        plan_id: input.planId,
        status: input.status,
        current_period_end: periodEndIso,
        provider: 'manual',
        provider_ref: input.providerRef?.trim() || existing.data.provider_ref,
        updated_at: nowIso,
      })
      .eq('id', existing.data.id)
      .select(
        'id, organization_id, plan_id, status, current_period_start, current_period_end, provider, provider_ref, plans(id, code, name, description, price_monthly, price_yearly, is_active)',
      )
      .single()

    if (error || !data) {
      return createErrorResponse(
        'Unable to update subscription.',
        error?.message,
      )
    }

    return createSuccessResponse(mapSubscription(data as Record<string, unknown>))
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      organization_id: organizationId,
      plan_id: input.planId,
      status: input.status,
      current_period_start: nowIso,
      current_period_end: periodEndIso,
      provider: 'manual',
      provider_ref: input.providerRef?.trim() || 'master-manual',
    })
    .select(
      'id, organization_id, plan_id, status, current_period_start, current_period_end, provider, provider_ref, plans(id, code, name, description, price_monthly, price_yearly, is_active)',
    )
    .single()

  if (error || !data) {
    return createErrorResponse(
      'Unable to create subscription.',
      error?.message,
    )
  }

  return createSuccessResponse(mapSubscription(data as Record<string, unknown>))
}

export async function setOrganizationStatus(
  organizationId: string,
  status: 'active' | 'trialing' | 'suspended' | 'cancelled',
): Promise<ServiceResponse<{ id: string; status: string }>> {
  const { data, error } = await supabase
    .from('organizations')
    .update({ status })
    .eq('id', organizationId)
    .select('id, status')
    .single()

  if (error || !data) {
    return createErrorResponse(
      'Unable to update restaurant status.',
      error?.message,
    )
  }

  return createSuccessResponse({
    id: String(data.id),
    status: String(data.status),
  })
}
