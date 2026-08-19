import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { AUTH_REDIRECT_STORAGE_KEY } from '@/constants/AUTH'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { pendingOAuthTenantHandoff } from '@/utils/oauthHandoff'
import { isPlatformMasterUser } from '@/utils/platformMaster'
import { resolveCustomerPostAuthRedirect } from '@/utils/postAuthRedirect'

function readAuthRedirect(): string {
  try {
    const stored = sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)
    if (stored?.startsWith('/') && !stored.startsWith('//')) {
      return stored
    }
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined') {
    const next = new URLSearchParams(window.location.search).get('next')
    if (next?.startsWith('/') && !next.startsWith('//')) {
      return next
    }
  }

  return ROUTES.HOME
}

function clearAuthRedirect() {
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function GuestRoute() {
  const { isAuthenticated, isLoading, role, user } = useAuth()
  const [customerPath, setCustomerPath] = useState<string | null>(null)

  const isCustomer =
    isAuthenticated &&
    role === 'customer' &&
    !isPlatformMasterUser(user)

  useEffect(() => {
    if (!isCustomer) {
      setCustomerPath(null)
      return
    }

    let cancelled = false
    const intended = readAuthRedirect()

    void resolveCustomerPostAuthRedirect(intended).then((path) => {
      if (cancelled) return
      clearAuthRedirect()
      setCustomerPath(path)
    })

    return () => {
      cancelled = true
    }
  }, [isCustomer])

  if (isLoading) {
    return <LoadingState fullPage variant="inline" />
  }

  if (pendingOAuthTenantHandoff()) {
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

    if (!customerPath) {
      return <LoadingState fullPage variant="inline" />
    }

    return <Navigate to={customerPath} replace />
  }

  return <Outlet />
}
