import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUTH_OAUTH_NEXT_COOKIE,
  AUTH_OAUTH_TENANT_COOKIE,
} from '@/constants/AUTH'
import {
  persistOAuthTenantCookie,
  readOAuthTenantCookie,
  recoverOAuthTenantHostIfNeeded,
  tenantStorefrontOrigin,
} from './authTenantCookie'

function mockDocumentCookie() {
  const jar = new Map<string, string>()

  vi.stubGlobal('document', {
    get cookie() {
      return [...jar.entries()]
        .map(([name, value]) => `${name}=${value}`)
        .join('; ')
    },
    set cookie(entry: string) {
      const [pair] = entry.split(';')
      const eq = pair.indexOf('=')
      if (eq === -1) return
      const name = pair.slice(0, eq).trim()
      const value = pair.slice(eq + 1).trim()
      if (!value) jar.delete(name)
      else jar.set(name, value)
    },
  })
}

describe('authTenantCookie', () => {
  beforeEach(() => {
    mockDocumentCookie()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds tenant storefront origin', () => {
    expect(tenantStorefrontOrigin('chopsticksspicemalabar')).toBe(
      'https://chopsticksspicemalabar.directapp.in',
    )
  })

  it('persists and reads tenant + next on directapp.in', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'chopsticksspicemalabar.directapp.in' },
    })

    persistOAuthTenantCookie('chopsticksspicemalabar', '/onam?checkout=1')

    expect(readOAuthTenantCookie()).toEqual({
      tenant: 'chopsticksspicemalabar',
      next: '/onam?checkout=1',
    })
    expect(document.cookie).toContain(`${AUTH_OAUTH_TENANT_COOKIE}=`)
    expect(document.cookie).toContain(`${AUTH_OAUTH_NEXT_COOKIE}=`)
  })

  it('redirects to the tenant that started OAuth when Supabase lands elsewhere', () => {
    const replace = vi.fn()
    vi.stubGlobal('window', {
      location: {
        hostname: 'thetasteofandhra.directapp.in',
        pathname: '/login',
        search: '',
        hash: '#access_token=abc',
        replace,
      },
    })

    persistOAuthTenantCookie('chopsticksspicemalabar', '/onam?checkout=1')

    expect(
      recoverOAuthTenantHostIfNeeded({
        hostname: 'thetasteofandhra.directapp.in',
        pathname: '/login',
        search: '',
        hash: '#access_token=abc',
      }),
    ).toBe(true)

    expect(replace).toHaveBeenCalledWith(
      'https://chopsticksspicemalabar.directapp.in/login?tenant=chopsticksspicemalabar&next=%2Fonam%3Fcheckout%3D1#access_token=abc',
    )
  })

  it('does not redirect when already on the intended tenant host', () => {
    const replace = vi.fn()
    vi.stubGlobal('window', {
      location: {
        hostname: 'chopsticksspicemalabar.directapp.in',
        pathname: '/login',
        search: '',
        hash: '',
        replace,
      },
    })

    persistOAuthTenantCookie('chopsticksspicemalabar', '/onam')

    expect(
      recoverOAuthTenantHostIfNeeded({
        hostname: 'chopsticksspicemalabar.directapp.in',
        pathname: '/login',
        search: '',
        hash: '',
      }),
    ).toBe(false)

    expect(replace).not.toHaveBeenCalled()
  })
})
