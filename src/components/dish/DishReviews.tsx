import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useDishReviews } from '@/hooks/useDishReviews'
import * as reviewService from '@/services/reviewService'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

interface DishReviewsProps {
  dishId: string
}

export function DishReviews({ dishId }: DishReviewsProps) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { reviews, userReview, isLoading, error, refetch } =
    useDishReviews(dishId)
  const [rating, setRating] = useState(userReview?.rating ?? 0)
  const [reviewText, setReviewText] = useState(userReview?.review ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setRating(userReview?.rating ?? 0)
    setReviewText(userReview?.review ?? '')
  }, [userReview])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!isAuthenticated) {
      toast.error('Please sign in to leave a review')
      navigate(ROUTES.LOGIN)
      return
    }

    if (rating < 1) {
      toast.error('Please select a rating')
      return
    }

    setIsSubmitting(true)

    const result = await reviewService.submitReview({
      dishId,
      rating,
      review: reviewText,
    })

    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(userReview ? 'Review updated' : 'Review submitted')
    void refetch()
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">
          Customer Reviews
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {reviews.length} review{reviews.length === 1 ? '' : 's'}
        </p>
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="rounded-[var(--radius-card)] border border-black/5 bg-surface p-5 shadow-sm"
      >
        <h3 className="font-medium text-text-primary">
          {userReview ? 'Update your review' : 'Write a review'}
        </h3>

        <div className="mt-4">
          <p className="mb-2 text-sm text-text-secondary">Your rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className="rounded p-1 transition-colors hover:bg-primary/5"
                aria-label={`Rate ${value} stars`}
              >
                <Star
                  className={cn(
                    'h-6 w-6',
                    value <= rating
                      ? 'fill-accent text-accent'
                      : 'text-gray-300',
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="Your review (optional)"
          className="mt-4"
          rows={3}
          value={reviewText}
          onChange={(event) => setReviewText(event.target.value)}
          placeholder="Share your experience with this dish..."
        />

        <Button type="submit" className="mt-4" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : userReview ? 'Update Review' : 'Submit Review'}
        </Button>
      </form>

      {isLoading && (
        <p className="text-sm text-text-secondary">Loading reviews...</p>
      )}

      {!isLoading && error && (
        <p className="text-sm text-error">{error}</p>
      )}

      {!isLoading && !error && reviews.length === 0 && (
        <p className="text-sm text-text-secondary">
          No reviews yet. Be the first to review this dish!
        </p>
      )}

      <ul className="space-y-4">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="rounded-[var(--radius-card)] border border-black/5 bg-background p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-text-primary">
                {review.author_name}
              </p>
              <div className="flex items-center gap-1">
                {Array.from({ length: review.rating }).map((_, index) => (
                  <Star
                    key={index}
                    className="h-4 w-4 fill-accent text-accent"
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
            {review.review && (
              <p className="mt-2 text-sm text-text-secondary">{review.review}</p>
            )}
            <p className="mt-2 text-xs text-text-secondary">
              {formatDate(review.created_at)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
