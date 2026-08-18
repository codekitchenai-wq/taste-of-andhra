import { useEffect } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { restaurantDisplayName } from '@/utils/tenantFeatures'

export function useTenantDocumentTitle(suffix?: string) {
  const org = useOrganization()

  useEffect(() => {
    const name = restaurantDisplayName(org)
    document.title = suffix ? `${name} · ${suffix}` : name
  }, [org.name, org.organizationId, org.slug, suffix])
}
