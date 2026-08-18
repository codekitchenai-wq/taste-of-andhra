import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  parseSessionFromLocationHash,
  shouldHandoffOAuthSession,
  tenantSessionHandoffUrl,
} from './oauthHandoff'

describe('tenantSessionHandoffUrl', () => {
  it('copies the session to the tenant login hash', () => {
    expect(
      tenantSessionHandoffUrl({
        tenant: 'chopsticksspicemalabar',
        next: '/onam',
        accessToken: 'tok',
        refreshToken: 'ref',
      }),
    ).toBe(
      'https://chopsticksspicemalabar.directapp.in/login?tenant=chopsticksspicemalabar&next=%2Fonam#access_token=tok&refresh_token=ref&token_type=bearer',
    )
  })

  it('preserves plus signs in JWTs through encode and parse', () => {
    const url = tenantSessionHandoffUrl({
      tenant: 'chopsticksspicemalabar',
      accessToken: 'abc+def',
      refreshToken: 'ghi+jkl',
    })
    expect(url).toContain('access_token=abc%2Bdef')
    expect(url).toContain('refresh_token=ghi%2Bjkl')
    expect(parseSessionFromLocationHash(url?.split('#')[1] ?? '')).toEqual({
      access_token: 'abc+def',
      refresh_token: 'ghi+jkl',
    })
  })

  it('does not build a handoff URL without tokens', () => {
    expect(
      tenantSessionHandoffUrl({
        tenant: 'chopsticksspicemalabar',
        next: '/',
      }),
    ).toBeNull()
  })

  it('reads access and refresh tokens from the location hash', () => {
    expect(
      parseSessionFromLocationHash(
        '#access_token=tok&refresh_token=ref&token_type=bearer',
      ),
    ).toEqual({ access_token: 'tok', refresh_token: 'ref' })
  })
})

describe('shouldHandoffOAuthSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('skips handoff during the continue=google hop', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?tenant=chopsticksspicemalabar&continue=google',
        hash: '',
      },
    })
    expect(shouldHandoffOAuthSession()).toBe(false)
  })

  it('hands off after Google returns with a code', () => {
    vi.stubGlobal('window', {
      location: {
        search: '?tenant=chopsticksspicemalabar&code=abc',
        hash: '',
      },
    })
    expect(shouldHandoffOAuthSession()).toBe(true)
  })

  it('hands Spice Malabar off Taste of Andhra after Site URL fallback', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'www.thetasteofandhra.com',
        search: '?tenant=chopsticksspicemalabar',
        hash: '',
      },
    })
    expect(shouldHandoffOAuthSession()).toBe(true)
  })

  it('does not treat Taste of Andhra as a foreign tenant on its own domain', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'www.thetasteofandhra.com',
        search: '?tenant=thetasteofandhra',
        hash: '',
      },
    })
    expect(shouldHandoffOAuthSession()).toBe(false)
  })
})
