import { cn } from '@/utils/cn'

interface ProfileSectionCardProps {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function ProfileSectionCard({
  title,
  description,
  action,
  children,
  className,
}: ProfileSectionCardProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-black/[0.06] bg-surface p-4 shadow-sm',
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text-primary">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}
