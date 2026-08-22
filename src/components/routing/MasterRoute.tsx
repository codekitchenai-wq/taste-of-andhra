import { useEffect } from 'react'
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { PLATFORM_BRAND_NAME } from '@/constants/PLATFORM'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { isPlatformMasterUser } from '@/utils/platformMaster'
import { cn } from '@/utils/cn'

export function MasterRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return <LoadingState fullPage variant="inline" />
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.MASTER.LOGIN} replace />
  }

  if (!isPlatformMasterUser(user)) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return <Outlet />
}

const NAV_ITEMS = [
  { label: 'Dashboard', to: ROUTES.MASTER.DASHBOARD, exact: true },
  { label: 'Approvals', to: ROUTES.MASTER.APPROVALS, exact: false },
  { label: 'Restaurants', to: ROUTES.MASTER.TENANTS, exact: false },
  { label: 'Feature catalog', to: ROUTES.MASTER.FEATURES, exact: false },
  { label: 'Onboard new', to: ROUTES.MASTER.ONBOARD, exact: true },
  {
    label: 'Starter intake',
    to: ROUTES.MASTER.STARTER_INTAKE,
    exact: true,
  },
] as const

export function MasterLayout() {
  const { user, logout } = useAuth()

  useEffect(() => {
    document.title = `${PLATFORM_BRAND_NAME} Master`
  }, [])

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-black/10 bg-surface">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 py-3">
            <Link to={ROUTES.MASTER.DASHBOARD} className="flex items-center gap-2">
              <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-white">
                Master
              </span>
              <span className="font-heading text-base font-bold text-text-primary">
                {PLATFORM_BRAND_NAME}
              </span>
            </Link>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>{user?.full_name ?? user?.email ?? 'Master'}</span>
              <span className="text-black/20">·</span>
              <button
                type="button"
                onClick={() => void logout()}
                className="font-medium text-primary hover:underline"
              >
                Sign out
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto pb-0">
            {NAV_ITEMS.map(({ label, to, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  cn(
                    'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-secondary hover:border-black/20 hover:text-text-primary',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
