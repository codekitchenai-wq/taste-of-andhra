import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'

export function GuestRoute() {
  const { isAuthenticated, isLoading, role } = useAuth()

  if (isLoading) {
    return <LoadingState fullPage variant="inline" />
  }

  if (isAuthenticated) {
    if (role === 'admin') {
      return <Navigate to={ROUTES.ADMIN.DASHBOARD} replace />
    }

    return <Navigate to={ROUTES.HOME} replace />
  }

  return <Outlet />
}
