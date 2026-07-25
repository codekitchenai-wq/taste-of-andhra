import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'

export function DeliveryRoute() {
  const { isAuthenticated, isLoading, role } = useAuth()

  if (isLoading) {
    return <LoadingState fullPage variant="inline" />
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.DELIVERY.LOGIN} replace />
  }

  if (role !== 'delivery') {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return <Outlet />
}
