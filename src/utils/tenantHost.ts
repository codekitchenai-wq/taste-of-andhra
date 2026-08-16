import { PLATFORM_ROOT_DOMAIN } from '@/constants/PLATFORM'

/**
 * Extract tenant slug from a platform hostname.
 * Supports:
 * - `{slug}.{root}` → slug
 * - `www.{slug}.{root}` → slug
 * Returns null for apex, www apex, localhost, or unrelated hosts.
 */
export function slugFromHostname(
  hostname: string,
  rootDomain: string = PLATFORM_ROOT_DOMAIN,
): string | null {
  const host = hostname.trim().toLowerCase()
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
