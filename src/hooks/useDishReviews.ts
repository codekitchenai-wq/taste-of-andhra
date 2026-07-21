import { useCallback, useEffect, useState } from 'react'
import * as reviewService from '@/services/reviewService'
import type { ReviewWithAuthor } from '@/services/reviewService'
import type { Review } from '@/types/Review'

export function useDishReviews(dishId: string | undefined) {
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([])
  const [userReview, setUserReview] = useState<Review | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!dishId) {
      setReviews([])
      setUserReview(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const [reviewsResult, userReviewResult] = await Promise.all([
      reviewService.getReviewsByDish(dishId),
      reviewService.getUserReviewForDish(dishId),
    ])

    if (reviewsResult.success) {
      setReviews(reviewsResult.data)
    } else {
      setError(reviewsResult.message)
      setReviews([])
    }

    if (userReviewResult.success) {
      setUserReview(userReviewResult.data)
    } else {
      setUserReview(null)
    }

    setIsLoading(false)
  }, [dishId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { reviews, userReview, isLoading, error, refetch }
}
