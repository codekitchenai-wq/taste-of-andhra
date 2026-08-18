import { afterEach, describe, expect, it, vi } from 'vitest'
import { recoverOAuthTenantHostIfNeeded } from './authTenantCookie'
import {
  shouldHandoffOAuthSession,
  tenantSessionHandoffUrl,
} from './oauthHandoff'
import {
  googleOAuthPreflightUrl,
  googleOAuthRedirectTo,
} from './oauthRedirect'

function spiceWindow(search = '') {
  vi.stubGlobal('window', {
    location: {
      hostname: 'chopsticksspicemalabar.directapp.in',
      port: '',
      origin: 'https://chopsticksspicemalabar.directapp.in',
      search,
      pathname: '/login',
      hash: '',
      replace: vi.fn(),
    },
  })
}

function toaWindow(search: string, hash = '') {
  vi.stubGlobal('window', {
    location: {
      hostname: 'www.thetasteofandhra.com',
      port: '',
      origin: 'https://www.thetasteofandhra.com',
      search,
      pathname: '/login',
      hash,
      replace: vi.fn(),
    },
  })
}

describe('Spice Malabar Google OAuth tenant flow', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts Google on the restaurant host, not Taste of Andhra', () => {
    spiceWindow()
    expect(googleOAuthPreflightUrl('/login', '/')).toBeNull()
    expect(googleOAuthRedirectTo('/login', '/')).toBe(
      'https://chopsticksspicemalabar.directapp.in/login?tenant=chopsticksspicemalabar&next=%2F',
    )
    expect(googleOAuthRedirectTo('/login', '/')).not.toContain(
      'thetasteofandhra.com',
    )
  })

  it('does not bounce the preflight or PKCE return off Taste of Andhra', () => {
    const preflight =
      '?tenant=chopsticksspicemalabar&continue=google&next=%2F'
    toaWindow(preflight)
    expect(
      recoverOAuthTenantHostIfNeeded({
        hostname: 'www.thetasteofandhra.com',
        pathname: '/login',
        search: preflight,
        hash: '',
      }),
    ).toBe(false)

    const pkce = '?tenant=chopsticksspicemalabar&code=pkce-code&next=%2F'
    toaWindow(pkce)
    expect(
      recoverOAuthTenantHostIfNeeded({
        hostname: 'www.thetasteofandhra.com',
        pathname: '/login',
        search: pkce,
        hash: '',
      }),
    ).toBe(false)
  })

  it('hands the finished session back to Spice Malabar, not Taste of Andhra', () => {
    toaWindow('?tenant=chopsticksspicemalabar&code=pkce-code')
    expect(shouldHandoffOAuthSession()).toBe(true)

    const target = tenantSessionHandoffUrl({
      tenant: 'chopsticksspicemalabar',
      next: '/',
      accessToken: 'tok',
      refreshToken: 'ref',
    })
    expect(target).toContain('https://chopsticksspicemalabar.directapp.in/login')
    expect(target).not.toContain('thetasteofandhra.com')
    expect(target).toContain('tenant=chopsticksspicemalabar')
  })
})
