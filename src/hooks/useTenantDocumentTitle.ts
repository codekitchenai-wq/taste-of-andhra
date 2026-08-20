import { useEffect } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { restaurantDisplayName } from '@/utils/tenantFeatures'
import {
  buildStarterSeo,
  CUISINE_SETTING_KEY,
  isWebsiteStarterTrack,
} from '@/utils/websiteStarter'

export function useTenantDocumentTitle(suffix?: string) {
  const org = useOrganization()

  useEffect(() => {
    const name = restaurantDisplayName(org)
    if (isWebsiteStarterTrack(org.settings) && !suffix) {
      const seo = buildStarterSeo({
        name,
        city:
          typeof org.settings.city === 'string'
            ? String(org.settings.city)
            : null,
        cuisine:
          typeof org.settings[CUISINE_SETTING_KEY] === 'string'
            ? String(org.settings[CUISINE_SETTING_KEY])
            : null,
      })
      document.title = seo.title
      const meta = document.querySelector('meta[name="description"]')
      if (meta) meta.setAttribute('content', seo.description)
      return
    }
    document.title = suffix ? `${name} · ${suffix}` : name
  }, [org.name, org.organizationId, org.slug, org.settings, suffix])
}
