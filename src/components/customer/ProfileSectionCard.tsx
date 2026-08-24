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
        'rounded-2xl border border-black/[0.06] bg-surface p-5 shadow-sm md:p-6',
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary md:text-lg">
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
      <div className="mt-5">{children}</div>
    </section>
  )
}
