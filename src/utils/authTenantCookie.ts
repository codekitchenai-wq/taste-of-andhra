import { OAUTH_TENANT_COOKIE } from '@/constants/AUTH'
import { PLATFORM_ROOT_DOMAIN } from '@/constants/PLATFORM'
import { isLocalDevHostname } from '@/utils/tenantHost'

const COOKIE_MAX_AGE_SECONDS = 600

function cookieDomain(): string | null {
  if (typeof window === 'undefined') return null
  if (isLocalDevHostname(window.location.hostname)) return null
  return `.${PLATFORM_ROOT_DOMAIN}`
}

/** Remember which restaurant started Google OAuth (survives the www hop). */
export function persistOAuthTenantCookie(slug: string): void {
  if (typeof document === 'undefined') return
  const value = slug.trim().toLowerCase()
  if (!value) return

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
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const domain = cookieDomain()
  const domainAttr = domain ? `; Domain=${domain}` : ''
  document.cookie = `${OAUTH_TENANT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}${domainAttr}`
}
