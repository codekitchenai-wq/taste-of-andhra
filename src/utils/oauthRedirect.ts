import {
  AUTH_GOOGLE_CONTINUE_PARAM,
  AUTH_GOOGLE_CONTINUE_VALUE,
} from '@/constants/AUTH'
import { ROUTES } from '@/constants/ROUTES'
import { resolveTenantSlugFromLocation } from '@/utils/tenantHost'

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
 * Google returns to the restaurant that started login.
 * `{slug}.directapp.in` stays on that origin — do not hop through Taste of Andhra.
 *
 * Local `{slug}.localhost` still rewrites to localhost (Google allowlist).
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

  return `${origin}${suffix}`
}

/**
 * Only `{slug}.localhost` needs a hop (not on the Google allowlist).
 * Production restaurants start Google on their own host.
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

  return null
}
