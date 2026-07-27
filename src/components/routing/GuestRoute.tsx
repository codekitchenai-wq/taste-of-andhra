import { useEffect, useMemo } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { AUTH_REDIRECT_STORAGE_KEY } from '@/constants/AUTH'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { isPlatformMasterUser } from '@/utils/platformMaster'

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
  const { isAuthenticated, isLoading, role, user } = useAuth()
  const customerRedirect = useMemo(() => readAuthRedirect(), [])

  useEffect(() => {
    if (
      !isAuthenticated ||
      role === 'admin' ||
      role === 'delivery' ||
      role === 'platform_master' ||
      isPlatformMasterUser(user)
    ) {
      return
    }

    try {
      sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [isAuthenticated, role, user])

  if (isLoading) {
    return <LoadingState fullPage variant="inline" />
  }

  if (isAuthenticated) {
    if (isPlatformMasterUser(user) || role === 'platform_master') {
      return <Navigate to={ROUTES.MASTER.DASHBOARD} replace />
    }

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
