import { useEffect } from 'react'
import { Link, Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { PLATFORM_BRAND_NAME } from '@/constants/PLATFORM'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { isPlatformMasterUser } from '@/utils/platformMaster'

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

export function MasterLayout() {
  const { user, logout } = useAuth()

  useEffect(() => {
    document.title = `${PLATFORM_BRAND_NAME} Master`
  }, [])

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-black/10 bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-heading text-lg font-bold text-primary">
              {PLATFORM_BRAND_NAME} Master
            </p>
            <p className="text-xs text-text-secondary">
              {user?.full_name ?? `${PLATFORM_BRAND_NAME} Master`} · control
              plane
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              to={ROUTES.MASTER.DASHBOARD}
              className="text-text-secondary hover:text-primary"
            >
              Dashboard
            </Link>
            <Link
              to={ROUTES.MASTER.TENANTS}
              className="text-text-secondary hover:text-primary"
            >
              Tenants
            </Link>
            <Link
              to={ROUTES.MASTER.ONBOARD}
              className="text-text-secondary hover:text-primary"
            >
              Onboard
            </Link>
            <Link
              to={ROUTES.MASTER.FEATURES}
              className="text-text-secondary hover:text-primary"
            >
              Features
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="font-medium text-primary hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
