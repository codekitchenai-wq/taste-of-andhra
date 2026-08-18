import { OAUTH_CONTINUE_GOOGLE } from '@/constants/AUTH'
import { PLATFORM_ROOT_DOMAIN, PLATFORM_WWW_URL } from '@/constants/PLATFORM'
import {
  isLocalDevHostname,
  isPlatformApexHost,
  isPlatformHostname,
  resolveTenantSlugFromLocation,
  slugFromHostname,
} from '@/utils/tenantHost'

export interface OAuthRedirectLocation {
  hostname: string
  origin: string
  port?: string
}

function readLocation(): OAuthRedirectLocation {
  if (typeof window === 'undefined') {
    return { hostname: 'localhost', origin: 'http://localhost:5173', port: '5173' }
  }

  return {
    hostname: window.location.hostname,
    origin: window.location.origin,
    port: window.location.port || undefined,
  }
}

function normalizePath(path: string): string {
  const trimmed = path.trim() || '/login'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function localDevOrigin(port = '5173'): string {
  return `http://localhost:${port}`
}

export function shouldContinueGoogleOAuth(search: string): boolean {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  return params.get('continue') === OAUTH_CONTINUE_GOOGLE
}

/**
 * Supabase OAuth `redirectTo` for the current host.
 * Tenant `{slug}.directapp.in` returns on the same origin; local `{slug}.localhost`
 * and custom domains return through bare localhost / www with `?tenant=`.
 */
export function googleOAuthRedirectTo(
  path: string,
  tenantSlug?: string | null,
  location: OAuthRedirectLocation = readLocation(),
): string {
  const slug =
    tenantSlug?.trim().toLowerCase() ||
    resolveTenantSlugFromLocation({
      hostname: location.hostname,
      search: typeof window !== 'undefined' ? window.location.search : '',
      persist: false,
    })

  const normalizedPath = normalizePath(path)

  if (slug && location.hostname.endsWith('.localhost')) {
    const port = location.port || '5173'
    return `${localDevOrigin(port)}${normalizedPath}?tenant=${encodeURIComponent(slug)}`
  }

  if (slug && slugFromHostname(location.hostname) === slug) {
    return `${location.origin}${normalizedPath}`
  }

  if (
    slug &&
    !isPlatformHostname(location.hostname, PLATFORM_ROOT_DOMAIN) &&
    !isLocalDevHostname(location.hostname)
  ) {
    return `${PLATFORM_WWW_URL}${normalizedPath}?tenant=${encodeURIComponent(slug)}`
  }

  if (slug && isPlatformApexHost(location.hostname, PLATFORM_ROOT_DOMAIN)) {
    return `${PLATFORM_WWW_URL}${normalizedPath}?tenant=${encodeURIComponent(slug)}`
  }

  if (slug && isLocalDevHostname(location.hostname)) {
    const port = location.port || '5173'
    return `${localDevOrigin(port)}${normalizedPath}?tenant=${encodeURIComponent(slug)}`
  }

  return `${location.origin}${normalizedPath}`
}

/**
 * When Google OAuth is started on `{slug}.localhost` or a custom domain, move to
 * localhost / www first so PKCE stays on one allowlisted origin.
 */
export function googleOAuthPreflightUrl(
  loginPath: string,
  nextPath?: string,
  location: OAuthRedirectLocation = readLocation(),
): string | null {
  const slug = resolveTenantSlugFromLocation({
    hostname: location.hostname,
    search: typeof window !== 'undefined' ? window.location.search : '',
    persist: false,
  })
  if (!slug) return null

  const params = new URLSearchParams({
    tenant: slug,
    continue: OAUTH_CONTINUE_GOOGLE,
  })

  if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) {
    params.set('next', nextPath)
  }

  const normalizedPath = normalizePath(loginPath)
  const query = params.toString()

  if (location.hostname.endsWith('.localhost')) {
    const port = location.port || '5173'
    return `${localDevOrigin(port)}${normalizedPath}?${query}`
  }

  if (slugFromHostname(location.hostname) === slug) {
    return null
  }

  if (
    !isPlatformHostname(location.hostname, PLATFORM_ROOT_DOMAIN) &&
    !isLocalDevHostname(location.hostname)
  ) {
    return `${PLATFORM_WWW_URL}${normalizedPath}?${query}`
  }

  return null
}
