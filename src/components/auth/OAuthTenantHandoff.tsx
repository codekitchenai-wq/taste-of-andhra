import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { persistOAuthTenantCookie, readOAuthTenantCookie } from '@/utils/authTenantCookie'
import { handoffOAuthSessionToTenant } from '@/utils/oauthHandoff'
import { resolveTenantSlugFromLocation } from '@/utils/tenantHost'

/**
 * When Google returns to Taste of Andhra (Supabase Site URL), send the session
 * back to the restaurant that started login.
 */
export function OAuthTenantHandoff() {
  const { isLoading, isAuthenticated } = useAuth()
  const started = useRef(false)

  useEffect(() => {
    const tenant = resolveTenantSlugFromLocation({ persist: false })
    const next = new URLSearchParams(window.location.search).get('next') ?? undefined
    if (tenant && !readOAuthTenantCookie()) {
      persistOAuthTenantCookie(tenant, next)
    }
  }, [])

  useEffect(() => {
    if (isLoading || started.current) return
    if (!isAuthenticated) return

    started.current = true
    void handoffOAuthSessionToTenant()
  }, [isLoading, isAuthenticated])

  return null
}
