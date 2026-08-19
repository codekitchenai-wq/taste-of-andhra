import { OAUTH_TENANT_COOKIE, OAUTH_TENANT_STORAGE_KEY } from '@/constants/AUTH'
import { PLATFORM_ROOT_DOMAIN } from '@/constants/PLATFORM'
import { isLocalDevHostname } from '@/utils/tenantHost'

const COOKIE_MAX_AGE_SECONDS = 600

function cookieDomain(): string | null {
  if (typeof window === 'undefined') return null
  if (isLocalDevHostname(window.location.hostname)) return null
  return `.${PLATFORM_ROOT_DOMAIN}`
}

function persistOAuthTenantStorage(slug: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(OAUTH_TENANT_STORAGE_KEY, slug)
  } catch {
    // Private mode / blocked storage
  }
}

function readOAuthTenantStorage(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const value = sessionStorage.getItem(OAUTH_TENANT_STORAGE_KEY)?.trim().toLowerCase()
    return value || null
  } catch {
    return null
  }
}

function clearOAuthTenantStorage(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(OAUTH_TENANT_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Remember which restaurant started Google OAuth (survives the www hop). */
export function persistOAuthTenantCookie(slug: string): void {
  if (typeof document === 'undefined') return
  const value = slug.trim().toLowerCase()
  if (!value) return

  persistOAuthTenantStorage(value)

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const domain = cookieDomain()
  const domainAttr = domain ? `; Domain=${domain}` : ''

  document.cookie = `${OAUTH_TENANT_COOKIE}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}${domainAttr}`
}

export function readOAuthTenantCookie(): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${OAUTH_TENANT_COOKIE}=`
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(prefix)) continue
    const raw = trimmed.slice(prefix.length)
    try {
      const decoded = decodeURIComponent(raw).trim().toLowerCase()
      return decoded || null
    } catch {
      return null
    }
  }
  return null
}

export function clearOAuthTenantCookie(): void {
  if (typeof document === 'undefined') return
  clearOAuthTenantStorage()
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const domain = cookieDomain()
  const domainAttr = domain ? `; Domain=${domain}` : ''
  document.cookie = `${OAUTH_TENANT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}${domainAttr}`
}

/** Tenant slug from OAuth callback URL, cookie, or www sessionStorage. */
export function resolveOAuthTenantSlug(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  const fromUrl = params.get('tenant') || params.get('org')
  if (fromUrl?.trim()) return fromUrl.trim().toLowerCase()

  return readOAuthTenantCookie() || readOAuthTenantStorage()
}
