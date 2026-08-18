import {
  AUTH_GOOGLE_CONTINUE_PARAM,
  AUTH_GOOGLE_CONTINUE_VALUE,
  AUTH_OAUTH_CALLBACK_ORIGIN,
} from '@/constants/AUTH'
import { ROUTES } from '@/constants/ROUTES'
import {
  isLocalDevHostname,
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
 * Production `{slug}.directapp.in` hops to the Supabase Site URL
 * (`www.thetasteofandhra.com` until migrated) so Google accepts redirectTo
 * and `?tenant=` survives the callback.
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

  if (slugFromHostname(host) && !isLocalDevHostname(host)) {
    return `${AUTH_OAUTH_CALLBACK_ORIGIN}${suffix}`
  }

  return `${origin}${suffix}`
}

/**
 * Local `{slug}.localhost` is not on the Google/Supabase allowlist, so hop to
 * localhost first. Production restaurant subdomains hop to the Supabase Site URL
 * so PKCE and the tenant cookie stay on an allowed redirect origin.
 */
export function googleOAuthPreflightUrl(
  loginPath: string = ROUTES.LOGIN,
  nextPath?: string,
): string | null {
  const { host, port } = currentLocation()
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

  if (slugFromHostname(host) && !isLocalDevHostname(host)) {
    return `${AUTH_OAUTH_CALLBACK_ORIGIN}${path}?${query}`
  }

  return null
}
