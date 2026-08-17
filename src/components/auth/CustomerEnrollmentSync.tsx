import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/contexts/OrganizationContext'
import { enrollCurrentCustomer } from '@/services/customerEnrollmentService'

/** After Google/email/WhatsApp login, enroll this user at the current restaurant. */
export function CustomerEnrollmentSync() {
  const { isAuthenticated, role, isLoading: authLoading } = useAuth()
  const { organizationId, isLoading: orgLoading } = useOrganization()

  useEffect(() => {
    if (authLoading || orgLoading) return
    if (!isAuthenticated || role !== 'customer') return
    void enrollCurrentCustomer(organizationId)
  }, [authLoading, orgLoading, isAuthenticated, role, organizationId])

  return null
}
