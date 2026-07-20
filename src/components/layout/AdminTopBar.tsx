import { Bell, Search, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/ROUTES'
import { Container } from '@/components/ui/Container'

interface AdminTopBarProps {
  title: string
}

export function AdminTopBar({ title }: AdminTopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-[72px] border-b border-black/5 bg-surface/95 backdrop-blur-md">
      <Container className="flex h-full items-center justify-between gap-4">
        <h1 className="font-heading text-xl font-semibold md:text-2xl">
          {title}
        </h1>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative hidden md:block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search..."
              className="h-10 w-64 rounded-[var(--radius-input)] border border-gray-300 bg-background pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Search admin panel"
            />
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          <Link
            to={ROUTES.HOME}
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
            aria-label="Admin profile"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </Container>
    </header>
  )
}
