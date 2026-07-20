import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200/80', className)}
      aria-hidden="true"
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
      <Skeleton className="mb-4 aspect-[4/3] w-full rounded-[var(--radius-card)]" />
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="mb-4 h-4 w-full" />
      <Skeleton className="h-10 w-full rounded-[var(--radius-button)]" />
    </div>
  )
}
