import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface QuickLinkCardProps {
  title: string
  description: string
  to: string
  icon: LucideIcon
}

export function QuickLinkCard({
  title,
  description,
  to,
  icon: Icon,
}: QuickLinkCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        'group rounded-[var(--radius-card)] bg-surface p-5 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-semibold text-text-primary group-hover:text-primary">
            {title}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </div>
      </div>
    </Link>
  )
}
