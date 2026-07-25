import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Review } from '@/types/Review'
import { supabase } from '@/services/supabaseClient'

export interface ReviewWithAuthor extends Review {
  author_name: string
}

export interface ReviewInput {
  dishId: string
  rating: number
  review?: string
}

function mapReview(row: Record<string, unknown>): Review {
  return {
    id: row.id as string,
    dish_id: row.dish_id as string,
    user_id: row.user_id as string,
    rating: Number(row.rating),
    review: (row.review as string | null) ?? null,
    created_at: row.created_at as string,
  }
}

function mapReviewWithAuthor(row: Record<string, unknown>): ReviewWithAuthor {
  const profile = row.profiles as { full_name: string } | null

  return {
    ...mapReview(row),
    author_name: profile?.full_name ?? 'Customer',
  }
}

async function requireUserId(): Promise<ServiceResponse<string>> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return createErrorResponse('Unable to verify your session.', error.message)
  }

  if (!user) {
    return createErrorResponse('Please sign in to leave a review.')
  }

  return createSuccessResponse(user.id)
}

export async function getReviewsByDish(
  dishId: string,
): Promise<ServiceResponse<ReviewWithAuthor[]>> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(full_name)')
    .eq('dish_id', dishId)
    .order('created_at', { ascending: false })

  if (error) {
    return createErrorResponse('Unable to load reviews.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapReviewWithAuthor))
}

export async function getUserReviewForDish(
  dishId: string,
): Promise<ServiceResponse<Review | null>> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return createSuccessResponse(null)
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('dish_id', dishId)
    .eq('user_id', userResult.data)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load your review.', error.message)
  }

  return createSuccessResponse(data ? mapReview(data) : null)
}

export async function submitReview(
  input: ReviewInput,
): Promise<ServiceResponse<Review>> {
  const userResult = await requireUserId()

  if (!userResult.success) {
    return userResult
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return createErrorResponse('Rating must be between 1 and 5.')
  }

  const { data, error } = await supabase
    .from('reviews')
    .upsert(
      {
        dish_id: input.dishId,
        user_id: userResult.data,
        rating: input.rating,
        review: input.review?.trim() || null,
      },
      { onConflict: 'dish_id,user_id' },
    )
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to submit review.', error.message)
  }

  // dishes.rating is recalculated by the sync_dish_rating trigger.
  return createSuccessResponse(mapReview(data))
}
