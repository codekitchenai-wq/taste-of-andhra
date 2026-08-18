import {
  LOYALTY_MAX_REDEEM_RATIO,
  LOYALTY_POINTS_PER_RUPEE,
  LOYALTY_REDEEM_POINTS,
  LOYALTY_REDEEM_VALUE,
} from '@/constants/LOYALTY'
import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { LoyaltyAccount, LoyaltyTransaction } from '@/types/Loyalty'
import { getResolvedOrganizationId } from '@/services/currentOrganization'
import { requireUserId } from '@/services/requireUserId'
import { supabase } from '@/services/supabaseClient'
import { insertWithOrgFallback } from '@/utils/insertWithOrgFallback'
import { isMissingColumnError } from '@/utils/supabaseSchema'

function mapAccount(row: Record<string, unknown>): LoyaltyAccount {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    organization_id: (row.organization_id as string | undefined) ?? undefined,
    points_balance: Number(row.points_balance),
    lifetime_earned: Number(row.lifetime_earned),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

function mapTransaction(row: Record<string, unknown>): LoyaltyTransaction {
  return {
    id: row.id as string,
    account_id: row.account_id as string,
    points: Number(row.points),
    transaction_type: row.transaction_type as LoyaltyTransaction['transaction_type'],
    order_id: (row.order_id as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    created_at: row.created_at as string,
  }
}

export function pointsToRupees(points: number): number {
  return Math.floor(points / LOYALTY_REDEEM_POINTS) * LOYALTY_REDEEM_VALUE
}

export function rupeesToRedeemPoints(rupees: number): number {
  return Math.floor(rupees / LOYALTY_REDEEM_VALUE) * LOYALTY_REDEEM_POINTS
}

export function maxRedeemableDiscount(
  pointsBalance: number,
  subtotalAfterCoupon: number,
): { points: number; discount: number } {
  const maxByRatio = Math.floor(subtotalAfterCoupon * LOYALTY_MAX_REDEEM_RATIO)
  const maxByPoints = pointsToRupees(pointsBalance)
  const discount = Math.min(maxByRatio, maxByPoints)
  return {
    points: rupeesToRedeemPoints(discount),
    discount,
  }
}

export async function getOrCreateAccount(
  userId?: string,
): Promise<ServiceResponse<LoyaltyAccount>> {
  const uidResult = userId
    ? createSuccessResponse(userId)
    : await requireUserId()

  if (!uidResult.success) return uidResult

  const orgId = getResolvedOrganizationId()
  if (!orgId) {
    return createErrorResponse('Restaurant is not ready. Refresh and try again.')
  }

  let existingQuery = supabase
    .from('loyalty_accounts')
    .select('*')
    .eq('user_id', uidResult.data)

  if (orgId) existingQuery = existingQuery.eq('organization_id', orgId)

  let { data: existing, error: fetchError } = await existingQuery.maybeSingle()

  if (fetchError && isMissingColumnError(fetchError.message)) {
    const legacy = await supabase
      .from('loyalty_accounts')
      .select('*')
      .eq('user_id', uidResult.data)
      .maybeSingle()
    existing = legacy.data
    fetchError = legacy.error
  }

  if (fetchError) {
    return createErrorResponse(
      'Unable to load loyalty account.',
      fetchError.message,
    )
  }

  if (existing) {
    return createSuccessResponse(mapAccount(existing))
  }

  const inserted = await insertWithOrgFallback(supabase, 'loyalty_accounts', {
    user_id: uidResult.data,
    ...(orgId ? { organization_id: orgId } : {}),
  })

  if (inserted.error || !inserted.data) {
    return createErrorResponse(
      'Unable to create loyalty account.',
      inserted.error?.message,
    )
  }

  return createSuccessResponse(mapAccount(inserted.data))
}

export async function getTransactions(
  limit = 20,
): Promise<ServiceResponse<LoyaltyTransaction[]>> {
  const accountResult = await getOrCreateAccount()
  if (!accountResult.success) return accountResult

  const { data, error } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('account_id', accountResult.data.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return createErrorResponse(
      'Unable to load loyalty history.',
      error.message,
    )
  }

  return createSuccessResponse((data ?? []).map(mapTransaction))
}

export async function earnPointsForOrder(
  userId: string,
  orderId: string,
  orderTotal: number,
): Promise<ServiceResponse<LoyaltyAccount>> {
  const points = Math.floor(orderTotal * LOYALTY_POINTS_PER_RUPEE)
  if (points <= 0) {
    return getOrCreateAccount(userId)
  }

  const { error: rpcError } = await supabase.rpc('award_loyalty_for_order', {
    p_user_id: userId,
    p_order_id: orderId,
    p_order_total: orderTotal,
  })

  if (rpcError) {
    // Fallback for environments where the RPC is not yet migrated
    const accountResult = await getOrCreateAccount(userId)
    if (!accountResult.success) return accountResult

    const { data: existingEarn } = await supabase
      .from('loyalty_transactions')
      .select('id')
      .eq('order_id', orderId)
      .eq('transaction_type', 'earn')
      .maybeSingle()

    if (existingEarn) {
      return createSuccessResponse(accountResult.data)
    }

    const newBalance = accountResult.data.points_balance + points
    const lifetime = accountResult.data.lifetime_earned + points

    const { error: txError } = await supabase.from('loyalty_transactions').insert({
      account_id: accountResult.data.id,
      points,
      transaction_type: 'earn',
      order_id: orderId,
      note: `Earned ${points} points for order`,
    })

    if (txError) {
      return createErrorResponse(
        'Unable to award loyalty points.',
        txError.message,
      )
    }

    const { data, error } = await supabase
      .from('loyalty_accounts')
      .update({
        points_balance: newBalance,
        lifetime_earned: lifetime,
      })
      .eq('id', accountResult.data.id)
      .select()
      .single()

    if (error) {
      return createErrorResponse(
        'Unable to update loyalty balance.',
        error.message,
      )
    }

    return createSuccessResponse(mapAccount(data))
  }

  return getOrCreateAccount(userId)
}

export async function redeemPoints(
  points: number,
  orderId?: string,
): Promise<ServiceResponse<{ account: LoyaltyAccount; discount: number }>> {
  if (points <= 0 || points % LOYALTY_REDEEM_POINTS !== 0) {
    return createErrorResponse(
      `Redeem in multiples of ${LOYALTY_REDEEM_POINTS} points.`,
    )
  }

  const accountResult = await getOrCreateAccount()
  if (!accountResult.success) return accountResult

  if (accountResult.data.points_balance < points) {
    return createErrorResponse('Not enough loyalty points.')
  }

  const discount = pointsToRupees(points)
  const newBalance = accountResult.data.points_balance - points

  const { error: txError } = await supabase.from('loyalty_transactions').insert({
    account_id: accountResult.data.id,
    points: -points,
    transaction_type: 'redeem',
    order_id: orderId ?? null,
    note: `Redeemed ${points} points for ₹${discount} off`,
  })

  if (txError) {
    return createErrorResponse('Unable to redeem points.', txError.message)
  }

  const { data, error } = await supabase
    .from('loyalty_accounts')
    .update({ points_balance: newBalance })
    .eq('id', accountResult.data.id)
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to update loyalty balance.', error.message)
  }

  return createSuccessResponse({
    account: mapAccount(data),
    discount,
  })
}
