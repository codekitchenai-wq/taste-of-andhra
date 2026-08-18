import {
  AUTH_OAUTH_NEXT_COOKIE,
  AUTH_OAUTH_TENANT_COOKIE,
  AUTH_REDIRECT_STORAGE_KEY,
} from '@/constants/AUTH'
import { PLATFORM_ROOT_DOMAIN } from '@/constants/PLATFORM'
import { isPlatformHostname, slugFromHostname } from '@/utils/tenantHost'

const OAUTH_COOKIE_MAX_AGE_SECONDS = 600

export interface OAuthTenantCookieState {
  tenant: string
  next?: string
}

function cookieDomain(hostname: string): string | null {
  const host = hostname.trim().toLowerCase()
  const root = PLATFORM_ROOT_DOMAIN.trim().toLowerCase()
  if (!host.endsWith(`.${root}`) && host !== root) return null
  return `.${root}`
}

function writeCookie(
  name: string,
  value: string,
  hostname: string,
): void {
  const domain = cookieDomain(hostname)
  if (!domain || typeof document === 'undefined') return

  const encoded = encodeURIComponent(value)
  document.cookie = [
    `${name}=${encoded}`,
    `Path=/`,
    `Domain=${domain}`,
    `Max-Age=${OAUTH_COOKIE_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
    'Secure',
  ].join('; ')
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${name}=`
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length))
    }
  }
  return null
}

function clearCookie(name: string, hostname: string): void {
  const domain = cookieDomain(hostname)
  if (!domain || typeof document === 'undefined') return
  document.cookie = [
    `${name}=`,
    `Path=/`,
    `Domain=${domain}`,
    'Max-Age=0',
    'SameSite=Lax',
    'Secure',
  ].join('; ')
}

/** Remember tenant + return path before OAuth (survives Supabase Site URL fallback). */
export function persistOAuthTenantCookie(
  tenant: string,
  nextPath?: string,
  hostname: string = typeof window !== 'undefined'
    ? window.location.hostname
    : '',
): void {
  const slug = tenant.trim().toLowerCase()
  if (!slug || !isPlatformHostname(hostname)) return

  writeCookie(AUTH_OAUTH_TENANT_COOKIE, slug, hostname)
  if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) {
    writeCookie(AUTH_OAUTH_NEXT_COOKIE, nextPath, hostname)
  } else {
    clearCookie(AUTH_OAUTH_NEXT_COOKIE, hostname)
  }
}

export function readOAuthTenantCookie(): OAuthTenantCookieState | null {
  const tenant = readCookie(AUTH_OAUTH_TENANT_COOKIE)?.trim().toLowerCase()
  if (!tenant) return null

  const next = readCookie(AUTH_OAUTH_NEXT_COOKIE)?.trim()
  return {
    tenant,
    next:
      next && next.startsWith('/') && !next.startsWith('//') ? next : undefined,
  }
}

export function clearOAuthTenantCookie(
  hostname: string = typeof window !== 'undefined'
    ? window.location.hostname
    : '',
): void {
  clearCookie(AUTH_OAUTH_TENANT_COOKIE, hostname)
  clearCookie(AUTH_OAUTH_NEXT_COOKIE, hostname)
}

function restoreAuthRedirectFromCookie(state: OAuthTenantCookieState): void {
  if (!state.next) return
  try {
    if (!sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)) {
      sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, state.next)
    }
  } catch {
    // Private browsing may block sessionStorage.
  }
}

export function tenantStorefrontOrigin(slug: string): string {
  return `https://${slug.trim().toLowerCase()}.${PLATFORM_ROOT_DOMAIN}`
}

/**
 * When Supabase falls back to the platform Site URL, bounce back to the tenant
 * that started OAuth. Preserves hash tokens and the intended post-login path.
 */
export function recoverOAuthTenantHostIfNeeded(
  location: Pick<Location, 'hostname' | 'pathname' | 'search' | 'hash'> =
    typeof window !== 'undefined'
      ? window.location
      : { hostname: '', pathname: '/', search: '', hash: '' },
): boolean {
  const params = new URLSearchParams(
    location.search.startsWith('?') ? location.search.slice(1) : location.search,
  )
  const tenantFromUrl = params.get('tenant')?.trim().toLowerCase() || null

  const state = readOAuthTenantCookie()
  const intendedTenant = state?.tenant ?? tenantFromUrl
  if (!intendedTenant) return false

  const currentSlug = slugFromHostname(location.hostname)
  if (currentSlug === intendedTenant) {
    if (state) restoreAuthRedirectFromCookie(state)
    return false
  }

  const path = location.pathname || '/'
  if (!params.has('tenant')) params.set('tenant', intendedTenant)
  const nextPath = state?.next
  if (nextPath && !params.has('next')) params.set('next', nextPath)

  const search = params.toString()
  const target = `${tenantStorefrontOrigin(intendedTenant)}${path}${
    search ? `?${search}` : ''
  }${location.hash ?? ''}`

  window.location.replace(target)
  return true
}
