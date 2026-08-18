import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LoadingState } from '@/components/ui/LoadingState'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/contexts/OrganizationContext'
import { evaluateCurrentUserTenantAccess } from '@/services/tenantAccessService'
import type { AppPersonaRole } from '@/types/enums'

interface OrgStaffRouteProps {
  requiredRole: Extract<AppPersonaRole, 'admin' | 'delivery'>
  loginTo: string
}

export function OrgStaffRoute({ requiredRole, loginTo }: OrgStaffRouteProps) {
  const { isAuthenticated, isLoading, role, user, logout } = useAuth()
  const org = useOrganization()
  const [membershipOk, setMembershipOk] = useState<boolean | null>(null)

  const canCheck =
    isAuthenticated && role === requiredRole && Boolean(user) && !org.isLoading

  useEffect(() => {
    if (!canCheck || !user) {
      setMembershipOk(null)
      return
    }

    let cancelled = false
    setMembershipOk(null)
    void evaluateCurrentUserTenantAccess(
      user.id,
      requiredRole,
      org.organizationId,
    ).then((access) => {
      if (cancelled) return
      if (!access.allowed) {
        toast.error(access.message)
        void logout()
        setMembershipOk(false)
        return
      }
      setMembershipOk(true)
    })

    return () => {
      cancelled = true
    }
  }, [canCheck, org.organizationId, requiredRole, user, logout])

  if (isLoading) {
    return <LoadingState fullPage variant="inline" />
  }

  if (!isAuthenticated) {
    return <Navigate to={loginTo} replace />
  }

  if (role !== requiredRole) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  if (org.isLoading || membershipOk === null) {
    return <LoadingState fullPage variant="inline" />
  }

  if (!membershipOk) {
    return <Navigate to={loginTo} replace />
  }

  return <Outlet />
}
