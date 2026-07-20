import { cn } from '@/utils/cn'

interface ChipProps {
  label: string
  active?: boolean
  onClick?: () => void
  className?: string
}

export function Chip({ label, active = false, onClick, className }: ChipProps) {
  const Component = onClick ? 'button' : 'span'

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200',
        active
          ? 'bg-primary text-white'
          : 'bg-surface text-text-secondary shadow-sm hover:bg-primary/10 hover:text-primary',
        onClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
    >
      {label}
    </Component>
  )
}
