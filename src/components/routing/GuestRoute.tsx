import { useEffect, useMemo } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { AUTH_REDIRECT_STORAGE_KEY } from '@/constants/AUTH'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'

function readAuthRedirect(): string {
  try {
    const stored = sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)
    if (stored?.startsWith('/') && !stored.startsWith('//')) {
      return stored
    }
  } catch {
    // ignore
  }

  return ROUTES.HOME
}

export function GuestRoute() {
  const { isAuthenticated, isLoading, role } = useAuth()
  const customerRedirect = useMemo(() => readAuthRedirect(), [])

  useEffect(() => {
    if (!isAuthenticated || role === 'admin' || role === 'delivery') return

    try {
      sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [isAuthenticated, role])

  if (isLoading) {
    return <LoadingState fullPage variant="inline" />
  }

  if (isAuthenticated) {
    if (role === 'admin') {
      return <Navigate to={ROUTES.ADMIN.DASHBOARD} replace />
    }

    if (role === 'delivery') {
      return <Navigate to={ROUTES.DELIVERY.DASHBOARD} replace />
    }

    return <Navigate to={customerRedirect} replace />
  }

  return <Outlet />
}
