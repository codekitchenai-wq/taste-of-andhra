import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Offer } from '@/types/Offer'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { supabase } from '@/services/supabaseClient'
import { mapOffer } from '@/utils/mapOffer'

export interface OfferFormInput {
  title: string
  description?: string
  discountPercentage: number
  minimumOrder?: number
  couponCode?: string
  startDate: string
  endDate: string
  isActive?: boolean
}

export async function getAllOffers(): Promise<ServiceResponse<Offer[]>> {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return createErrorResponse('Unable to load offers.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapOffer))
}

export async function getActiveOffers(): Promise<ServiceResponse<Offer[]>> {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('created_at', { ascending: false })

  if (error) {
    return createErrorResponse('Unable to load offers.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapOffer))
}

function validateOfferInput(input: OfferFormInput): string | null {
  if (!input.title.trim()) return 'Title is required.'
  if (input.discountPercentage <= 0 || input.discountPercentage > 100) {
    return 'Discount must be between 1 and 100.'
  }
  if (!input.startDate || !input.endDate) return 'Start and end dates are required.'
  if (input.endDate < input.startDate) {
    return 'End date must be on or after start date.'
  }

  return null
}

export async function createOffer(
  input: OfferFormInput,
): Promise<ServiceResponse<Offer>> {
  const validationError = validateOfferInput(input)

  if (validationError) {
    return createErrorResponse(validationError)
  }

  const { data, error } = await supabase
    .from('offers')
    .insert({
      organization_id: DEFAULT_ORGANIZATION_ID,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      discount_percentage: input.discountPercentage,
      minimum_order: input.minimumOrder ?? 0,
      coupon_code: input.couponCode?.trim() || null,
      start_date: input.startDate,
      end_date: input.endDate,
      is_active: input.isActive ?? true,
    })
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to create offer.', error.message)
  }

  return createSuccessResponse(mapOffer(data))
}

export async function updateOffer(
  id: string,
  input: Partial<OfferFormInput>,
): Promise<ServiceResponse<Offer>> {
  const updates: Record<string, unknown> = {}

  if (input.title !== undefined) {
    if (!input.title.trim()) {
      return createErrorResponse('Title is required.')
    }

    updates.title = input.title.trim()
  }

  if (input.description !== undefined) {
    updates.description = input.description.trim() || null
  }

  if (input.discountPercentage !== undefined) {
    if (input.discountPercentage <= 0 || input.discountPercentage > 100) {
      return createErrorResponse('Discount must be between 1 and 100.')
    }

    updates.discount_percentage = input.discountPercentage
  }

  if (input.minimumOrder !== undefined) {
    updates.minimum_order = input.minimumOrder
  }

  if (input.couponCode !== undefined) {
    updates.coupon_code = input.couponCode.trim() || null
  }

  if (input.startDate !== undefined) {
    updates.start_date = input.startDate
  }

  if (input.endDate !== undefined) {
    updates.end_date = input.endDate
  }

  if (input.isActive !== undefined) {
    updates.is_active = input.isActive
  }

  if (Object.keys(updates).length === 0) {
    return createErrorResponse('No changes provided.')
  }

  const { data, error } = await supabase
    .from('offers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to update offer.', error.message)
  }

  return createSuccessResponse(mapOffer(data))
}

export interface CouponValidation {
  offer: Offer
  discountAmount: number
}

export async function validateCoupon(
  couponCode: string,
  subtotal: number,
): Promise<ServiceResponse<CouponValidation>> {
  const code = couponCode.trim()

  if (!code) {
    return createErrorResponse('Enter a coupon code.')
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('is_active', true)
    .ilike('coupon_code', code)
    .lte('start_date', today)
    .gte('end_date', today)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to validate coupon.', error.message)
  }

  if (!data) {
    return createErrorResponse('Invalid or expired coupon code.')
  }

  const offer = mapOffer(data)

  if (subtotal < offer.minimum_order) {
    return createErrorResponse(
      `Minimum order of ₹${offer.minimum_order} required for this coupon.`,
    )
  }

  const discountAmount =
    Math.round(subtotal * (offer.discount_percentage / 100) * 100) / 100

  return createSuccessResponse({ offer, discountAmount })
}

export async function deleteOffer(id: string): Promise<ServiceResponse<null>> {
  const { error } = await supabase
    .from('offers')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return createErrorResponse('Unable to delete offer.', error.message)
  }

  return createSuccessResponse(null)
}
