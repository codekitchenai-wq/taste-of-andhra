import { Bell, Menu, Search, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/ROUTES'
import { Container } from '@/components/ui/Container'

interface AdminTopBarProps {
  title: string
  description?: string
  onMenuToggle?: () => void
}

export function AdminTopBar({
  title,
  description,
  onMenuToggle,
}: AdminTopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-surface/95 backdrop-blur-md">
      <Container className="flex min-h-14 items-center justify-between gap-3 py-2 md:min-h-[3.5rem]">
        <div className="flex min-w-0 items-center gap-2.5">
          {onMenuToggle && (
            <button
              type="button"
              onClick={onMenuToggle}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-semibold leading-tight md:text-xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-0.5 hidden truncate text-xs text-text-secondary sm:block md:text-sm">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <div className="relative hidden lg:block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search..."
              className="h-9 w-56 rounded-[var(--radius-input)] border border-gray-300 bg-background pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Search admin panel"
            />
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <Link
            to={ROUTES.HOME}
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
            aria-label="Admin profile"
          >
            <User className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </header>
  )
}
