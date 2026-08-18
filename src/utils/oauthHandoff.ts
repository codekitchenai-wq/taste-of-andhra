import { ROUTES } from '@/constants/ROUTES'
import { supabase } from '@/services/supabaseClient'
import {
  clearOAuthTenantCookie,
  readOAuthTenantCookie,
  tenantStorefrontOrigin,
} from '@/utils/authTenantCookie'
import { hostServesTenant, resolveTenantSlugFromLocation } from '@/utils/tenantHost'

export function tenantSessionHandoffUrl(input: {
  tenant: string
  next?: string
  accessToken?: string
  refreshToken?: string
}): string | null {
  const tenant = input.tenant.trim().toLowerCase()
  if (!tenant) return null

  const params = new URLSearchParams()
  params.set('tenant', tenant)
  if (input.next?.startsWith('/') && !input.next.startsWith('//')) {
    params.set('next', input.next)
  }

  const origin = tenantStorefrontOrigin(tenant)
  const search = params.toString()
  const target = `${origin}${ROUTES.LOGIN}?${search}`

  if (!input.accessToken || !input.refreshToken) return target

  const hash = new URLSearchParams({
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
    token_type: 'bearer',
    type: 'recovery',
  })
  return `${target}#${hash.toString()}`
}

function intendedTenantAndNext(): { tenant: string; next?: string } | null {
  const fromCookie = readOAuthTenantCookie()
  const fromUrl = resolveTenantSlugFromLocation({ persist: false })
  const tenant = fromCookie?.tenant ?? fromUrl
  if (!tenant) return null

  let next = fromCookie?.next
  if (typeof window !== 'undefined') {
    const fromQuery = new URLSearchParams(window.location.search).get('next')
    if (!next && fromQuery?.startsWith('/') && !fromQuery.startsWith('//')) {
      next = fromQuery
    }
  }
  return { tenant, next }
}

/**
 * After Google finishes on the Supabase Site URL, copy the session to the
 * restaurant that started login. Tokens are passed in the hash for one hop.
 */
export async function handoffOAuthSessionToTenant(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const intended = intendedTenantAndNext()
  if (!intended) return false
  if (hostServesTenant(window.location.hostname, intended.tenant)) return false

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const target = tenantSessionHandoffUrl({
    tenant: intended.tenant,
    next: intended.next,
    accessToken: session?.access_token,
    refreshToken: session?.refresh_token,
  })
  if (!target) return false

  clearOAuthTenantCookie()
  window.location.replace(target)
  return true
}
