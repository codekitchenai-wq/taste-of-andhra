import { CardSkeleton } from '@/components/ui/Skeleton'
import { cn } from '@/utils/cn'

interface LoadingStateProps {
  fullPage?: boolean
  variant?: 'grid' | 'inline'
}

export function LoadingState({
  fullPage = false,
  variant = 'grid',
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className={cn(fullPage && 'min-h-[50vh] py-12')}
    >
      {variant === 'grid' ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <CardSkeleton />
        </div>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  )
}
