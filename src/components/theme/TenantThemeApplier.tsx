import { useEffect } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { isPlatformMarketingHost } from '@/utils/platformHost'
import {
  applyTenantThemeCss,
  clearTenantThemeCss,
  parseStorefrontTheme,
} from '@/utils/tenantTheme'

/**
 * Paints the current restaurant's brand onto CSS variables already used by
 * Tailwind. No extra stylesheets or webfonts are loaded.
 */
export function TenantThemeApplier() {
  const { branding, isLoading } = useOrganization()

  useEffect(() => {
    if (isPlatformMarketingHost()) {
      clearTenantThemeCss()
      return
    }
    if (isLoading) return
    applyTenantThemeCss(parseStorefrontTheme(branding))
  }, [branding, isLoading])

  return null
}
