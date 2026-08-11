import { cn } from '@/utils/cn'

interface SelectOption {
  label: string
  value: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
  compact?: boolean
}

export function Select({
  label,
  error,
  options,
  placeholder,
  compact = false,
  id,
  className,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={cn('flex w-full flex-col', compact ? 'gap-0.5' : 'gap-2')}>
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            'font-medium text-text-primary',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full rounded-[var(--radius-input)] border border-gray-300 bg-surface text-sm text-text-primary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          compact ? 'h-9 px-2.5' : 'h-12 px-4',
          error && 'border-error focus:border-error focus:ring-error/20',
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p
          id={`${selectId}-error`}
          className={cn('text-error', compact ? 'text-xs' : 'text-sm')}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}
