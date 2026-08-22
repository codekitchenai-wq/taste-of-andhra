import { ENABLE_TASTE_OF_ANDHRA_CUSTOM_DOMAIN } from '@/constants/ARCHITECTURE_GATES'
import { AUTH_REDIRECT_STORAGE_KEY } from '@/constants/AUTH'
import { PLATFORM_ROOT_DOMAIN, PLATFORM_WWW_URL } from '@/constants/PLATFORM'
import {
  TASTE_OF_ANDHRA_CUSTOM_HOSTS,
  isTasteOfAndhraSlug,
} from '@/constants/TENANTS'
import { enrollCurrentCustomer } from '@/services/customerEnrollmentService'
import { supabase } from '@/services/supabaseClient'
import {
  clearOAuthTenantCookie,
  persistOAuthTenantCookie,
  resolveOAuthTenantSlug,
} from '@/utils/authTenantCookie'
import {
  googleOAuthRedirectTo,
  shouldContinueGoogleOAuth,
} from '@/utils/oauthRedirect'
import {
  hostServesTenant,
  isLocalDevHostname,
  isPlatformApexHost,
  isTasteOfAndhraCustomHost,
  resolveTenantSlugFromLocation,
  slugFromHostname,
} from '@/utils/tenantHost'

/** Storefront origin to return the customer after Google OAuth. */
export function tenantStorefrontOrigin(
  slug: string,
  port = typeof window !== 'undefined' ? window.location.port || '5173' : '5173',
): string {
  const key = slug.trim().toLowerCase()
  if (!key) return PLATFORM_WWW_URL

  if (typeof window !== 'undefined' && isLocalDevHostname(window.location.hostname)) {
    return `http://${key}.localhost:${port}`
  }

  if (isTasteOfAndhraSlug(key)) {
    if (!ENABLE_TASTE_OF_ANDHRA_CUSTOM_DOMAIN) {
      return `https://${key}.${PLATFORM_ROOT_DOMAIN}`
    }
    return `https://${TASTE_OF_ANDHRA_CUSTOM_HOSTS[1]}`
  }

  return `https://${key}.${PLATFORM_ROOT_DOMAIN}`
}

export function parseSessionFromUrlHash(
  hash: string = typeof window !== 'undefined' ? window.location.hash : '',
): { access_token: string; refresh_token: string } | null {
  if (!hash || !hash.includes('access_token=')) return null

  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return null
  return { access_token, refresh_token }
}

export function isGoogleOAuthReturn(
  search: string,
  hash: string = '',
): boolean {
  if (hash.includes('access_token=')) return true
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  return (
    params.has('code') ||
    params.has('error') ||
    shouldContinueGoogleOAuth(search)
  )
}

/** Send thetasteofandhra.com visitors to www until that custom domain is re-enabled. */
export function disabledTasteOfAndhraRedirectUrl(location: {
  hostname: string
  pathname: string
  search?: string
  hash?: string
}): string | null {
  if (ENABLE_TASTE_OF_ANDHRA_CUSTOM_DOMAIN) return null
  if (!isTasteOfAndhraCustomHost(location.hostname)) return null

  const path = location.pathname || '/'
  return `${PLATFORM_WWW_URL}${path}${location.search ?? ''}${location.hash ?? ''}`
}

/**
 * Google often returns to the Taste of Andhra Site URL (*.thetasteofandhra.com).
 * The oauth tenant cookie lives on `.directapp.in`, so move the return to www
 * before the session is applied — even when the custom domain is enabled.
 */
export function bridgeOAuthReturnFromTasteOfAndhraUrl(location: {
  hostname: string
  pathname: string
  search?: string
  hash?: string
}): string | null {
  if (!isTasteOfAndhraCustomHost(location.hostname)) return null
  if (!isGoogleOAuthReturn(location.search ?? '', location.hash ?? '')) {
    return null
  }

  const path = location.pathname || '/login'
  return `${PLATFORM_WWW_URL}${path}${location.search ?? ''}${location.hash ?? ''}`
}

export function redirectDisabledTasteOfAndhraHost(): boolean {
  if (typeof window === 'undefined') return false
  const url = disabledTasteOfAndhraRedirectUrl(window.location)
  if (!url) return false
  window.location.replace(url)
  return true
}

/** Hop Google returns off thetasteofandhra.com onto www.directapp.in (cookie domain). */
export function redirectOAuthReturnFromTasteOfAndhraHost(): boolean {
  if (typeof window === 'undefined') return false
  const url = bridgeOAuthReturnFromTasteOfAndhraUrl(window.location)
  if (!url) return false
  window.location.replace(url)
  return true
}

function sessionHash(accessToken: string, refreshToken: string): string {
  return new URLSearchParams({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'bearer',
  }).toString()
}

async function hopSessionToOrigin(
  targetOrigin: string,
  tenant: string | null,
  next: string | null,
  accessToken: string,
  refreshToken: string,
  clearCookie: boolean,
): Promise<void> {
  await supabase.auth.signOut()
  if (clearCookie) clearOAuthTenantCookie()

  window.location.replace(
    `${targetOrigin}/login${loginQuery(tenant, next)}#${sessionHash(accessToken, refreshToken)}`,
  )
}

function loginQuery(tenant: string | null, next: string | null): string {
  const loginParams = new URLSearchParams()
  if (tenant) loginParams.set('tenant', tenant)
  if (next?.startsWith('/') && !next.startsWith('//')) {
    loginParams.set('next', next)
  }
  const query = loginParams.toString()
  return query ? `?${query}` : ''
}

/** Carry an already-issued hash session to the restaurant without consuming it here. */
function hopHashToTenant(targetOrigin: string, tenant: string, next: string | null): void {
  persistOAuthTenantCookie(tenant)
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  window.location.replace(`${targetOrigin}/login${loginQuery(tenant, next)}#${hash}`)
}

export function stripUrlHash(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.hash) return
  url.hash = ''
  window.history.replaceState({}, '', `${url.pathname}${url.search}`)
}

function shouldApplySessionHashOnThisHost(): boolean {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname
  const tenant = resolveOAuthTenantSlug(window.location.search)

  // Always hop first when the OAuth restaurant is known and this host is not it.
  if (tenant) {
    return hostServesTenant(hostname, tenant)
  }

  // Callback / Site URL hosts without a tenant must not consume the session —
  // handoff needs the hash (or getSession) to copy to the restaurant.
  if (isPlatformApexHost(hostname) || isTasteOfAndhraCustomHost(hostname)) {
    return false
  }

  const hostSlug = slugFromHostname(hostname)
  // Taste of Andhra is the common Supabase Site URL host — never keep another
  // restaurant's Google session here when the oauth tenant cookie/query is missing.
  if (isTasteOfAndhraSlug(hostSlug)) {
    return false
  }

  // Other restaurant subdomains with no oauth tenant: apply for that restaurant.
  return Boolean(hostSlug)
}

/** Apply `#access_token` tokens on the restaurant host (PKCE does not auto-set them). */
export async function applySessionFromUrlHash(): Promise<boolean> {
  const tokens = parseSessionFromUrlHash()
  if (!tokens) return false
  if (!shouldApplySessionHashOnThisHost()) return false

  const { error } = await supabase.auth.setSession(tokens)
  stripUrlHash()
  clearOAuthTenantCookie()

  if (error) return false

  const slug = resolveTenantSlugFromLocation({ persist: false })
  if (slug) {
    await enrollCurrentCustomerForSlug(slug)
  }

  return true
}

async function enrollCurrentCustomerForSlug(slug: string): Promise<void> {
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (data?.id) {
    await enrollCurrentCustomer(String(data.id))
  }
}

export function isOAuthCompletionHost(hostname: string): boolean {
  return (
    isPlatformApexHost(hostname) ||
    isTasteOfAndhraCustomHost(hostname) ||
    isLocalDevHostname(hostname)
  )
}

/** True while Google OAuth still needs to hop to the restaurant that started it. */
export function pendingOAuthTenantHandoff(
  hostname: string = typeof window !== 'undefined' ? window.location.hostname : '',
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): boolean {
  if (!hostname) return false
  if (shouldContinueGoogleOAuth(search)) return true
  if (parseSessionFromUrlHash()) return true
  if (
    !ENABLE_TASTE_OF_ANDHRA_CUSTOM_DOMAIN &&
    isTasteOfAndhraCustomHost(hostname)
  ) {
    return true
  }

  const tenant = resolveOAuthTenantSlug(search)
  if (!tenant) return false
  if (hostServesTenant(hostname, tenant)) return false

  const hostSlug = slugFromHostname(hostname)
  const mismatchedRestaurant =
    Boolean(hostSlug) && hostSlug !== tenant.trim().toLowerCase()

  if (!isOAuthCompletionHost(hostname) && !mismatchedRestaurant) {
    return false
  }

  return true
}

/**
 * After Google returns to www / localhost / a mismatched restaurant host,
 * copy the session to the restaurant that started OAuth.
 */
export async function handoffOAuthSessionToTenantIfNeeded(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const hostname = window.location.hostname
  if (shouldContinueGoogleOAuth(window.location.search)) return false

  const params = new URLSearchParams(window.location.search)
  const tenant = resolveOAuthTenantSlug(window.location.search)
  const next = params.get('next')

  const leaveTasteOfAndhra =
    !ENABLE_TASTE_OF_ANDHRA_CUSTOM_DOMAIN &&
    isTasteOfAndhraCustomHost(hostname)

  if (!tenant) return false
  if (hostServesTenant(hostname, tenant) && !leaveTasteOfAndhra) {
    return false
  }

  const hostSlug = slugFromHostname(hostname)
  const mismatchedRestaurant =
    Boolean(hostSlug) && hostSlug !== tenant.trim().toLowerCase()

  // Hop from platform callback hosts, Taste of Andhra Site URL, or the wrong
  // `{slug}.directapp.in` (e.g. landed on Taste of Andhra after Chopsticks Google login).
  if (!isOAuthCompletionHost(hostname) && !mismatchedRestaurant) {
    return false
  }

  const targetOrigin = tenantStorefrontOrigin(tenant)
  const hashTokens = parseSessionFromUrlHash()
  if (hashTokens) {
    hopHashToTenant(targetOrigin, tenant, next)
    return true
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token || !session.refresh_token) return false

  await hopSessionToOrigin(
    targetOrigin,
    tenant,
    next,
    session.access_token,
    session.refresh_token,
    true,
  )
  return true
}

/** Bounce to the restaurant that started OAuth when the wrong tenant host loaded. */
export function recoverOAuthTenantHostIfNeeded(): boolean {
  if (typeof window === 'undefined') return false

  const search = window.location.search
  const params = new URLSearchParams(search)
  const tenant = resolveOAuthTenantSlug(search)

  if (!tenant) return false

  const hostname = window.location.hostname

  // Bare localhost with ?tenant= is a supported local dev storefront URL.
  if (
    (hostname === 'localhost' || hostname === '127.0.0.1') &&
    (params.has('tenant') || params.has('org'))
  ) {
    return false
  }

  if (hostServesTenant(hostname, tenant)) return false
  if (shouldContinueGoogleOAuth(search)) return false

  const hasHash = Boolean(window.location.hash?.includes('access_token='))
  const hasPkceCode = params.has('code')

  if (isPlatformApexHost(hostname)) {
    // PKCE `code` must be exchanged on the redirectTo origin. Hash tokens can hop.
    if (hasPkceCode && !hasHash) return false
    if (!hasHash) return false
  }
  if (
    isTasteOfAndhraCustomHost(hostname) &&
    ENABLE_TASTE_OF_ANDHRA_CUSTOM_DOMAIN
  ) {
    return false
  }

  const targetOrigin = tenantStorefrontOrigin(tenant)
  const next = params.get('next')
  const loginParams = new URLSearchParams({ tenant })
  if (next?.startsWith('/') && !next.startsWith('//')) {
    loginParams.set('next', next)
  }
  if (shouldContinueGoogleOAuth(window.location.search)) {
    loginParams.set('continue', 'google')
  }

  window.location.replace(
    `${targetOrigin}/login?${loginParams.toString()}${window.location.hash}`,
  )
  return true
}

/** Start Google OAuth from the platform login hop (`continue=google`). */
export async function continueGoogleOAuthFromPreflight(): Promise<string | null> {
  const params = new URLSearchParams(window.location.search)
  const tenant = resolveOAuthTenantSlug(window.location.search)

  if (!tenant) {
    return 'Missing restaurant context for Google sign-in.'
  }

  persistOAuthTenantCookie(tenant)

  const next = params.get('next')
  if (next?.startsWith('/') && !next.startsWith('//')) {
    try {
      sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  const redirectTo = googleOAuthRedirectTo('/login', tenant)
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { prompt: 'select_account' },
    },
  })

  return error?.message ?? null
}
