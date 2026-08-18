import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { persistOAuthTenantCookie, readOAuthTenantCookie } from '@/utils/authTenantCookie'
import {
  handoffOAuthSessionToTenant,
  shouldHandoffOAuthSession,
} from '@/utils/oauthHandoff'
import {
  resolveTenantSlugFromLocation,
  slugFromHostname,
  slugFromSearchParams,
} from '@/utils/tenantHost'

/**
 * When Google returns to the platform Site URL, send the session back to the
 * restaurant that started login.
 */
export function OAuthTenantHandoff() {
  const { isLoading, isAuthenticated } = useAuth()
  const started = useRef(false)

  useEffect(() => {
    const hostname = window.location.hostname
    const hostSlug = slugFromHostname(hostname)
    const queryTenant = slugFromSearchParams(window.location.search, hostname)
    const tenant =
      hostSlug ?? queryTenant ?? resolveTenantSlugFromLocation({ persist: false })
    const next =
      new URLSearchParams(window.location.search).get('next') ?? undefined
    if ((hostSlug || queryTenant) && tenant) {
      persistOAuthTenantCookie(tenant, next)
      return
    }
    if (tenant && !readOAuthTenantCookie()) {
      persistOAuthTenantCookie(tenant, next)
    }
  }, [])

  useEffect(() => {
    if (isLoading || started.current) return
    if (!isAuthenticated) return
    if (!shouldHandoffOAuthSession()) return

    started.current = true
    void handoffOAuthSessionToTenant()
  }, [isLoading, isAuthenticated])

  return null
}
