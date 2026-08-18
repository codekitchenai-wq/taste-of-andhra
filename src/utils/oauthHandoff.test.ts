import { describe, expect, it } from 'vitest'
import { parseSessionFromLocationHash, tenantSessionHandoffUrl } from './oauthHandoff'

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
