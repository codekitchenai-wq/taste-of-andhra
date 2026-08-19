import { describe, expect, it, vi } from 'vitest'
import { OAUTH_TENANT_COOKIE } from '@/constants/AUTH'
import {
  clearOAuthTenantCookie,
  persistOAuthTenantCookie,
  readOAuthTenantCookie,
  resolveOAuthTenantSlug,
} from './authTenantCookie'

describe('authTenantCookie', () => {
  it('persists and reads the tenant slug cookie', () => {
    let cookieStore = ''
    vi.stubGlobal('document', {
      get cookie() {
        return cookieStore
      },
      set cookie(value: string) {
        cookieStore = value
      },
    })
    vi.stubGlobal('window', {
      location: { protocol: 'http:', hostname: 'localhost' },
    })

    persistOAuthTenantCookie('spice-malabar')
    expect(readOAuthTenantCookie()).toBe('spice-malabar')
    expect(resolveOAuthTenantSlug('')).toBe('spice-malabar')
    clearOAuthTenantCookie()
    expect(readOAuthTenantCookie()).toBeNull()

    vi.unstubAllGlobals()
  })

  it('uses the shared cookie name', () => {
    expect(OAUTH_TENANT_COOKIE).toBe('toa_oauth_tenant')
  })
})
