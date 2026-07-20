import { cn } from '@/utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
}

export function Card({ children, className, hoverable = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] bg-surface p-5 shadow-md',
        hoverable &&
          'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
    >
      {children}
    </div>
  )
}
