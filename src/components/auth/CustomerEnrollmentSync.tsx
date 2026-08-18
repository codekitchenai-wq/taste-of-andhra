import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/contexts/OrganizationContext'
import { enrollCurrentCustomer } from '@/services/customerEnrollmentService'
import { UNMATCHED_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { isPlatformMarketingHost } from '@/utils/platformHost'

/** After email/WhatsApp login, enroll this user at the current restaurant. */
export function CustomerEnrollmentSync() {
  const { isAuthenticated, role, isLoading: authLoading } = useAuth()
  const { organizationId, isLoading: orgLoading } = useOrganization()

  useEffect(() => {
    if (authLoading || orgLoading) return
    if (!isAuthenticated || role !== 'customer') return
    if (isPlatformMarketingHost()) return
    if (!organizationId || organizationId === UNMATCHED_ORGANIZATION_ID) return
    void enrollCurrentCustomer(organizationId)
  }, [authLoading, orgLoading, isAuthenticated, role, organizationId])

  return null
}
