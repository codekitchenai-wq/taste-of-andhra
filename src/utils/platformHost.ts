import { PLATFORM_ROOT_DOMAIN } from '@/constants/PLATFORM'
import { resolveTenantSlugFromLocation } from '@/utils/tenantHost'

/** True for directapp.in / www.directapp.in (platform marketing apex). */
export function isPlatformApexHostname(
  hostname: string,
  rootDomain: string = PLATFORM_ROOT_DOMAIN,
): boolean {
  const host = hostname.trim().toLowerCase()
  const root = rootDomain.trim().toLowerCase().replace(/^www\./, '')
  if (!host || !root) return false
  return host === root || host === `www.${root}`
}

/**
 * Whether this browser session should serve the DirectApp marketing site
 * instead of a restaurant storefront.
 *
 * A tenant slug always wins: `{slug}.localhost`, `{slug}.directapp.in`,
 * or local `?tenant=slug` must render that restaurant even when
 * VITE_FORCE_PLATFORM_SITE is on (that flag is only for bare localhost).
 */
export function isPlatformMarketingHost(
  hostname: string = typeof window !== 'undefined'
    ? window.location.hostname
    : '',
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): boolean {
  if (
    resolveTenantSlugFromLocation({
      hostname,
      search,
      persist: false,
    })
  ) {
    return false
  }

  const force = import.meta.env.VITE_FORCE_PLATFORM_SITE?.trim().toLowerCase()
  if (force === 'true' || force === '1' || force === 'yes') return true
  return isPlatformApexHostname(hostname)
}
