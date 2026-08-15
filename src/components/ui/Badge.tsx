import { cn } from '@/utils/cn'

type BadgeVariant =
  | 'veg'
  | 'nonVeg'
  | 'featured'
  | 'unavailable'
  | 'warning'
  | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  veg: 'bg-success/10 text-success',
  nonVeg: 'bg-error/10 text-error',
  featured: 'bg-accent/20 text-text-primary',
  unavailable: 'bg-gray-100 text-text-secondary',
  warning: 'bg-warning/10 text-warning',
  default: 'bg-primary/10 text-primary',
}

export function Badge({
  variant = 'default',
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
