import { PLATFORM_ROOT_DOMAIN } from '@/constants/PLATFORM'
import {
  TASTE_OF_ANDHRA_CUSTOM_HOSTS,
  TASTE_OF_ANDHRA_SLUG,
} from '@/constants/TENANTS'

const LOCAL_TENANT_STORAGE_KEY = 'toa_tenant_slug'

export function isLocalDevHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase()
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.localhost')
  )
}

function slugFromLocalhost(hostname: string): string | null {
  const host = hostname.trim().toLowerCase()
  if (!host.endsWith('.localhost')) return null
  const prefix = host.slice(0, -'.localhost'.length)
  if (!prefix) return null
  const parts = prefix.split('.')
  if (parts.length === 1 && parts[0]) return parts[0]
  if (parts.length === 2 && parts[0] === 'www' && parts[1]) return parts[1]
  return null
}

/**
 * Extract tenant slug from a platform hostname.
 * Supports:
 * - `{slug}.{root}` → slug
 * - `www.{slug}.{root}` → slug
 * - `{slug}.localhost` → slug (local Vite, no hosts file)
 * Returns null for apex, www apex, bare localhost, or unrelated hosts.
 */
export function slugFromHostname(
  hostname: string,
  rootDomain: string = PLATFORM_ROOT_DOMAIN,
): string | null {
  const host = hostname.trim().toLowerCase()
  const fromLocal = slugFromLocalhost(host)
  if (fromLocal) return fromLocal

  const root = rootDomain.trim().toLowerCase().replace(/^www\./, '')
  if (!host || !root) return null

  if (host === root || host === `www.${root}` || host === 'localhost') {
    return null
  }

  if (!host.endsWith(`.${root}`)) return null

  const prefix = host.slice(0, -(root.length + 1))
  if (!prefix) return null

  const parts = prefix.split('.')
  if (parts.length === 1 && parts[0]) return parts[0]
  if (parts.length === 2 && parts[0] === 'www' && parts[1]) return parts[1]

  return null
}

/**
 * `?tenant=` is only for hosts that do not already name a restaurant:
 * localhost, DirectApp apex, and the Taste of Andhra Site URL.
 * `{slug}.directapp.in` must ignore a leftover tenant query or the storefront
 * flips between restaurants (and can bounce forever with recover + index.html).
 */
export function slugFromSearchParams(
  search: string,
  hostname: string,
): string | null {
  if (
    !isLocalDevHostname(hostname) &&
    !isPlatformApexHost(hostname) &&
    !isTasteOfAndhraCustomHost(hostname)
  ) {
    return null
  }
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  if (!params.has('tenant') && !params.has('org')) return null
  const raw = (params.get('tenant') || params.get('org') || '').trim().toLowerCase()
  return raw || null
}

export function persistLocalTenantSlug(slug: string | null): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    if (slug) sessionStorage.setItem(LOCAL_TENANT_STORAGE_KEY, slug)
    else sessionStorage.removeItem(LOCAL_TENANT_STORAGE_KEY)
  } catch {
    // Private mode / blocked storage
  }
}

export function readPersistedLocalTenantSlug(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const value = sessionStorage.getItem(LOCAL_TENANT_STORAGE_KEY)
    return value?.trim() ? value.trim().toLowerCase() : null
  } catch {
    return null
  }
}

export function resolveTenantSlugFromLocation(input?: {
  hostname?: string
  search?: string
  persist?: boolean
}): string | null {
  const hostname =
    input?.hostname ??
    (typeof window !== 'undefined' ? window.location.hostname : '')
  const search =
    input?.search ??
    (typeof window !== 'undefined' ? window.location.search : '')
  const persist = input?.persist !== false

  const fromHost = slugFromHostname(hostname)
  if (fromHost) {
    if (persist) persistLocalTenantSlug(fromHost)
    return fromHost
  }

  const fromQuery = slugFromSearchParams(search, hostname)
  if (fromQuery) {
    if (persist) persistLocalTenantSlug(fromQuery)
    return fromQuery
  }

  if (isLocalDevHostname(hostname)) {
    return readPersistedLocalTenantSlug()
  }

  return null
}

/** Host variants for custom-domain lookup (with and without www). */
export function customDomainHostVariants(hostname: string): string[] {
  const host = hostname.trim().toLowerCase()
  if (!host) return []

  const variants = new Set<string>([host])
  if (host.startsWith('www.')) {
    variants.add(host.slice(4))
  } else {
    variants.add(`www.${host}`)
  }
  return [...variants]
}

/**
 * True when hostname is the platform apex or a tenant subdomain of the root,
 * not a third-party custom domain.
 */
export function isPlatformHostname(
  hostname: string,
  rootDomain: string = PLATFORM_ROOT_DOMAIN,
): boolean {
  const host = hostname.trim().toLowerCase()
  const root = rootDomain.trim().toLowerCase().replace(/^www\./, '')
  if (!host || !root) return false
  return host === root || host === `www.${root}` || host.endsWith(`.${root}`)
}

/** True when this hostname is already the storefront for `tenant`. */
export function hostServesTenant(hostname: string, tenant: string): boolean {
  const slug = tenant.trim().toLowerCase()
  if (!slug) return false
  if (slugFromHostname(hostname) === slug) return true
  if (slug === TASTE_OF_ANDHRA_SLUG) {
    const host = hostname.trim().toLowerCase()
    return (TASTE_OF_ANDHRA_CUSTOM_HOSTS as readonly string[]).includes(host)
  }
  return false
}

export function isTasteOfAndhraCustomHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase()
  return (TASTE_OF_ANDHRA_CUSTOM_HOSTS as readonly string[]).includes(host)
}

/** True for directapp.in / www.directapp.in (platform apex). */
export function isPlatformApexHost(
  hostname: string,
  rootDomain: string = PLATFORM_ROOT_DOMAIN,
): boolean {
  const host = hostname.trim().toLowerCase()
  const root = rootDomain.trim().toLowerCase().replace(/^www\./, '')
  if (!host || !root) return false
  return host === root || host === `www.${root}`
}

/**
 * Origins that complete Google OAuth (Supabase Site URL). Stay here until the
 * PKCE code is exchanged, then OAuthTenantHandoff copies the session to the
 * restaurant. Bouncing `?code=` off this host breaks Google login.
 */
export function isOAuthCallbackHost(hostname: string): boolean {
  return isPlatformApexHost(hostname) || isTasteOfAndhraCustomHost(hostname)
}
