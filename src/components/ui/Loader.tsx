import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

type LoaderSize = 'sm' | 'md' | 'lg'

interface LoaderProps {
  size?: LoaderSize
  label?: string
  fullPage?: boolean
  className?: string
}

const sizeStyles: Record<LoaderSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
}

export function Loader({
  size = 'md',
  label = 'Loading',
  fullPage = false,
  className,
}: LoaderProps) {
  const spinner = (
    <Loader2
      className={cn('animate-spin text-primary', sizeStyles[size], className)}
      aria-hidden="true"
    />
  )

  if (fullPage) {
    return (
      <div
        role="status"
        aria-label={label}
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3"
      >
        {spinner}
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
    )
  }

  return (
    <span role="status" aria-label={label} className="inline-flex">
      {spinner}
      <span className="sr-only">{label}</span>
    </span>
  )
}
