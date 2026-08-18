import {
  AUTH_GOOGLE_CONTINUE_PARAM,
  AUTH_GOOGLE_CONTINUE_VALUE,
  AUTH_OAUTH_CALLBACK_ORIGIN,
} from '@/constants/AUTH'
import { ROUTES } from '@/constants/ROUTES'
import {
  isLocalDevHostname,
  isOAuthCallbackHost,
  resolveTenantSlugFromLocation,
  slugFromHostname,
} from '@/utils/tenantHost'

function currentLocation() {
  if (typeof window === 'undefined') {
    return {
      host: 'localhost',
      port: '5173',
      origin: 'http://localhost:5173',
      search: '',
    }
  }

  return {
    host: window.location.hostname,
    port: window.location.port,
    origin: window.location.origin,
    search: window.location.search,
  }
}

export function shouldContinueGoogleOAuth(search: string): boolean {
  const params = new URLSearchParams(
    search.startsWith('?') ? search : `?${search}`,
  )
  return params.get(AUTH_GOOGLE_CONTINUE_PARAM) === AUTH_GOOGLE_CONTINUE_VALUE
}

function withTenantAndNext(
  path: string,
  tenant: string | null,
  nextPath?: string,
): string {
  const params = new URLSearchParams()
  if (tenant) params.set('tenant', tenant)
  if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
    params.set('next', nextPath)
  }
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

/**
 * Google/Supabase allowlist typically includes localhost, not `{slug}.localhost`.
 * Bounce local tenant hosts through localhost and keep `?tenant=` on the URL
 * because sessionStorage is origin-scoped and would be lost on the hop.
 *
 * Production Site URL is the DirectApp apex. Tenant subdomains are often
 * rejected, so start Google there with `?tenant=` and hand the session back.
 */
export function googleOAuthRedirectTo(
  loginPath: string = ROUTES.LOGIN,
  nextPath?: string,
): string {
  const { host, port, origin } = currentLocation()
  const path = loginPath.startsWith('/') ? loginPath : `/${loginPath}`
  const tenant = resolveTenantSlugFromLocation({ persist: false })
  const suffix = withTenantAndNext(path, tenant, nextPath)

  if (host.endsWith('.localhost') && host !== 'localhost') {
    const localOrigin = `http://localhost${port ? `:${port}` : ''}`
    return `${localOrigin}${suffix}`
  }

  if (
    tenant &&
    !isLocalDevHostname(host) &&
    origin !== AUTH_OAUTH_CALLBACK_ORIGIN &&
    !isOAuthCallbackHost(host) &&
    slugFromHostname(host)
  ) {
    return `${AUTH_OAUTH_CALLBACK_ORIGIN}${suffix}`
  }

  return `${origin}${suffix}`
}

/**
 * Production Site URL is www.directapp.in. Start Google there so PKCE and the
 * return URL share an origin. After login, `OAuthTenantHandoff` sends the
 * session to the restaurant host.
 */
export function googleOAuthPreflightUrl(
  loginPath: string = ROUTES.LOGIN,
  nextPath?: string,
): string | null {
  const { host, port, origin } = currentLocation()
  const path = loginPath.startsWith('/') ? loginPath : `/${loginPath}`
  const tenant = resolveTenantSlugFromLocation({ persist: false })
  const params = new URLSearchParams()
  if (tenant) params.set('tenant', tenant)
  params.set(AUTH_GOOGLE_CONTINUE_PARAM, AUTH_GOOGLE_CONTINUE_VALUE)
  if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
    params.set('next', nextPath)
  }
  const query = params.toString()

  if (host.endsWith('.localhost') && host !== 'localhost') {
    const localOrigin = `http://localhost${port ? `:${port}` : ''}`
    return `${localOrigin}${path}?${query}`
  }

  if (
    tenant &&
    slugFromHostname(host) &&
    !isLocalDevHostname(host) &&
    origin !== AUTH_OAUTH_CALLBACK_ORIGIN &&
    !isOAuthCallbackHost(host)
  ) {
    return `${AUTH_OAUTH_CALLBACK_ORIGIN}${path}?${query}`
  }

  return null
}
