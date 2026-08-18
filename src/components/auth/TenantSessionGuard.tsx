import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/contexts/OrganizationContext'
import { evaluateCurrentUserTenantAccess } from '@/services/tenantAccessService'
import { isPlatformMarketingHost } from '@/utils/platformHost'

/**
 * Logs out restaurant users who are signed in on the wrong tenant host.
 * DirectApp Master is not tenant-scoped.
 */
export function TenantSessionGuard() {
  const { user, isAuthenticated, isLoading: authLoading, logout, role } =
    useAuth()
  const org = useOrganization()
  const checkedKey = useRef('')

  useEffect(() => {
    if (authLoading || org.isLoading || !isAuthenticated || !user || !role) {
      return
    }
    if (role === 'platform_master') return
    if (isPlatformMarketingHost()) return

    const key = `${user.id}:${org.organizationId}`
    if (checkedKey.current === key) return

    let cancelled = false
    void evaluateCurrentUserTenantAccess(
      user.id,
      role,
      org.organizationId,
    ).then((access) => {
      if (cancelled) return
      if (!access.allowed) {
        toast.error(access.message)
        void logout()
        return
      }
      checkedKey.current = key
    })

    return () => {
      cancelled = true
    }
  }, [
    authLoading,
    org.isLoading,
    org.organizationId,
    isAuthenticated,
    user,
    role,
    logout,
  ])

  return null
}
