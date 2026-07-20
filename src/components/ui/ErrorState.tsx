import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this content. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-error">
        <AlertCircle className="h-8 w-8" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-text-secondary">{message}</p>
      {onRetry && (
        <Button className="mt-6" variant="secondary" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  )
}
