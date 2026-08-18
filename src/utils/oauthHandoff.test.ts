import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  disabledTasteOfAndhraRedirectUrl,
  pendingOAuthTenantHandoff,
  recoverOAuthTenantHostIfNeeded,
} from './oauthHandoff'

describe('recoverOAuthTenantHostIfNeeded', () => {
  const replace = vi.fn()

  beforeEach(() => {
    replace.mockReset()
    vi.stubGlobal('window', {
      location: {
        hostname: 'localhost',
        search: '?tenant=chopsticksspicemalabar',
        hash: '',
        replace,
      },
    })
    vi.stubGlobal('document', { cookie: '' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not bounce bare localhost with ?tenant= (local dev login URL)', () => {
    expect(recoverOAuthTenantHostIfNeeded()).toBe(false)
    expect(replace).not.toHaveBeenCalled()
  })

  it('still bounces bare localhost when only the OAuth cookie names a tenant', () => {
    vi.stubGlobal('document', { cookie: 'toa_oauth_tenant=chopsticksspicemalabar' })
    vi.stubGlobal('window', {
      location: {
        hostname: 'localhost',
        search: '',
        hash: '',
        port: '5173',
        replace,
      },
    })

    expect(recoverOAuthTenantHostIfNeeded()).toBe(true)
    expect(replace).toHaveBeenCalledWith(
      'http://chopsticksspicemalabar.localhost:5173/login?tenant=chopsticksspicemalabar',
    )
  })

  it('does not bounce when the hostname already serves the tenant', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'chopsticksspicemalabar.localhost',
        search: '?tenant=chopsticksspicemalabar',
        hash: '',
        port: '5173',
        replace,
      },
    })

    expect(recoverOAuthTenantHostIfNeeded()).toBe(false)
    expect(replace).not.toHaveBeenCalled()
  })

  it('bounces Taste of Andhra custom domain to Spice Malabar when tenant is known', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'www.thetasteofandhra.com',
        search: '?tenant=chopsticksspicemalabar',
        hash: '',
        replace,
      },
    })

    expect(recoverOAuthTenantHostIfNeeded()).toBe(true)
    expect(replace).toHaveBeenCalledWith(
      'https://chopsticksspicemalabar.directapp.in/login?tenant=chopsticksspicemalabar',
    )
  })
})

describe('pendingOAuthTenantHandoff', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('holds the login screen on www until the restaurant hop runs', () => {
    vi.stubGlobal('document', { cookie: '' })
    expect(
      pendingOAuthTenantHandoff(
        'www.directapp.in',
        '?tenant=chopsticksspicemalabar',
      ),
    ).toBe(true)
  })

  it('holds Taste of Andhra until Spice Malabar is restored', () => {
    vi.stubGlobal('document', { cookie: '' })
    expect(
      pendingOAuthTenantHandoff(
        'www.thetasteofandhra.com',
        '?tenant=chopsticksspicemalabar',
      ),
    ).toBe(true)
  })

  it('does not hold when already on the restaurant host', () => {
    vi.stubGlobal('document', { cookie: '' })
    expect(
      pendingOAuthTenantHandoff(
        'chopsticksspicemalabar.directapp.in',
        '?tenant=chopsticksspicemalabar',
      ),
    ).toBe(false)
  })

  it('holds Taste of Andhra custom domain while it is disabled', () => {
    vi.stubGlobal('document', { cookie: '' })
    expect(pendingOAuthTenantHandoff('www.thetasteofandhra.com', '')).toBe(true)
  })
})

describe('disabledTasteOfAndhraRedirectUrl', () => {
  it('sends the custom domain to www.directapp.in', () => {
    expect(
      disabledTasteOfAndhraRedirectUrl({
        hostname: 'www.thetasteofandhra.com',
        pathname: '/login',
        search: '',
        hash: '',
      }),
    ).toBe('https://www.directapp.in/login')
  })

  it('lets Google finish PKCE on the Site URL before bouncing', () => {
    expect(
      disabledTasteOfAndhraRedirectUrl({
        hostname: 'www.thetasteofandhra.com',
        pathname: '/login',
        search: '?code=abc',
        hash: '',
      }),
    ).toBeNull()
  })
})
