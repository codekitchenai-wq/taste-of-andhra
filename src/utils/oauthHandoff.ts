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

  if (!input.accessToken || !input.refreshToken) return null

  const hash = [
    `access_token=${encodeURIComponent(input.accessToken)}`,
    `refresh_token=${encodeURIComponent(input.refreshToken)}`,
    'token_type=bearer',
  ].join('&')
  return `${target}#${hash}`
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

  if (!session?.access_token || !session.refresh_token) return false

  const target = tenantSessionHandoffUrl({
    tenant: intended.tenant,
    next: intended.next,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  })
  if (!target) return false

  clearOAuthTenantCookie()
  window.location.replace(target)
  return true
}

export function parseSessionFromLocationHash(
  hash: string = typeof window !== 'undefined' ? window.location.hash : '',
): { access_token: string; refresh_token: string } | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null

  const access_token = hashValue(raw, 'access_token')
  const refresh_token = hashValue(raw, 'refresh_token')
  if (!access_token || !refresh_token) return null
  return { access_token, refresh_token }
}

function hashValue(raw: string, key: string): string | null {
  for (const part of raw.split('&')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq) !== key) continue
    const encoded = part.slice(eq + 1)
    if (!encoded) return null
    try {
      return decodeURIComponent(encoded)
    } catch {
      return encoded
    }
  }
  return null
}

function stripAuthHashFromAddressBar(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.hash.includes('access_token')) return
  url.hash = ''
  window.history.replaceState(
    {},
    '',
    `${url.pathname}${url.search}`,
  )
}

/**
 * PKCE clients ignore `#access_token=` (they expect `?code=`). After a tenant
 * handoff the tokens are in the hash, so apply them with setSession.
 */
export async function applySessionFromUrlHash(): Promise<boolean> {
  const tokens = parseSessionFromLocationHash()
  if (!tokens) return false

  const { error } = await supabase.auth.setSession(tokens)
  if (error) return false

  stripAuthHashFromAddressBar()
  return true
}
