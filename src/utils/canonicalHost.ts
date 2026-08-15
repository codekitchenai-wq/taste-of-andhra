import { PLATFORM_WWW_URL } from '@/constants/PLATFORM'

/** Production Vercel aliases that should never appear in the customer address bar. */
const PRODUCTION_VERCEL_HOSTS = new Set([
  'taste-of-andhra.vercel.app',
])

export function canonicalHostRedirectUrl(location: {
  hostname: string
  pathname: string
  search?: string
  hash?: string
}): string | null {
  const hostname = location.hostname.toLowerCase()
  if (!PRODUCTION_VERCEL_HOSTS.has(hostname)) return null

  const path = location.pathname || '/'
  return `${PLATFORM_WWW_URL}${path}${location.search ?? ''}${location.hash ?? ''}`
}

export function redirectToCanonicalHost(
  location: Pick<Location, 'hostname' | 'pathname' | 'search' | 'hash'> = window.location,
): boolean {
  const url = canonicalHostRedirectUrl(location)
  if (!url) return false
  window.location.replace(url)
  return true
}
