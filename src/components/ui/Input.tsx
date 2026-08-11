import { cn } from '@/utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  compact?: boolean
}

export function Input({
  label,
  error,
  compact = false,
  id,
  className,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={cn('flex w-full flex-col', compact ? 'gap-0.5' : 'gap-2')}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'font-medium text-text-primary',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-[var(--radius-input)] border border-gray-300 bg-surface text-sm text-text-primary transition-colors placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          compact ? 'h-9 px-2.5' : 'h-12 px-4',
          error && 'border-error focus:border-error focus:ring-error/20',
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p
          id={`${inputId}-error`}
          className={cn('text-error', compact ? 'text-xs' : 'text-sm')}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}
