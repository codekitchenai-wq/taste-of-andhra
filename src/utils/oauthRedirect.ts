import { OAUTH_CONTINUE_GOOGLE } from '@/constants/AUTH'
import {
  OAUTH_CALLBACK_ORIGIN,
  PLATFORM_ROOT_DOMAIN,
} from '@/constants/PLATFORM'
import {
  isLocalDevHostname,
  isPlatformApexHost,
  resolveTenantSlugFromLocation,
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
 * Supabase OAuth `redirectTo`.
 * Production always returns to the platform callback origin with `?tenant=` so a
 * Site URL fallback (Taste of Andhra) cannot drop the restaurant context.
 * Local `{slug}.localhost` returns through bare localhost with `?tenant=`.
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

  if (slug && isLocalDevHostname(location.hostname)) {
    const port = location.port || '5173'
    return `${localDevOrigin(port)}${normalizedPath}?tenant=${encodeURIComponent(slug)}`
  }

  if (slug) {
    return `${OAUTH_CALLBACK_ORIGIN}${normalizedPath}?tenant=${encodeURIComponent(slug)}`
  }

  return `${location.origin}${normalizedPath}`
}

/**
 * Move Google OAuth start onto the callback origin so PKCE and redirectTo match.
 * `{slug}.directapp.in` and custom domains hop through www; `{slug}.localhost` through localhost.
 */
export function googleOAuthPreflightUrl(
  loginPath: string,
  nextPath?: string,
  location: OAuthRedirectLocation = readLocation(),
  tenantSlug?: string | null,
): string | null {
  const slug =
    tenantSlug?.trim().toLowerCase() ||
    resolveTenantSlugFromLocation({
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

  if (isLocalDevHostname(location.hostname)) {
    return null
  }

  if (isPlatformApexHost(location.hostname, PLATFORM_ROOT_DOMAIN)) {
    return null
  }

  try {
    if (new URL(OAUTH_CALLBACK_ORIGIN).hostname === location.hostname) {
      return null
    }
  } catch {
    // ignore invalid env
  }

  return `${OAUTH_CALLBACK_ORIGIN}${normalizedPath}?${query}`
}
