import { cn } from '@/utils/cn'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  compact?: boolean
}

export function Textarea({
  label,
  error,
  compact = false,
  id,
  className,
  ...props
}: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={cn('flex w-full flex-col', compact ? 'gap-0.5' : 'gap-2')}>
      {label && (
        <label
          htmlFor={textareaId}
          className={cn(
            'font-medium text-text-primary',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          'w-full rounded-[var(--radius-input)] border border-gray-300 bg-surface text-sm text-text-primary transition-colors placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          compact ? 'min-h-[36px] px-2.5 py-1.5' : 'min-h-[100px] px-4 py-3',
          error && 'border-error focus:border-error focus:ring-error/20',
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />
      {error && (
        <p
          id={`${textareaId}-error`}
          className={cn('text-error', compact ? 'text-xs' : 'text-sm')}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}
