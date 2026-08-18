import { describe, expect, it } from 'vitest'
import {
  googleOAuthPreflightUrl,
  googleOAuthRedirectTo,
  shouldContinueGoogleOAuth,
} from './oauthRedirect'

describe('google OAuth redirect', () => {
  it('keeps production tenant subdomains on the same origin', () => {
    const location = {
      hostname: 'chopsticksspicemalabar.directapp.in',
      origin: 'https://chopsticksspicemalabar.directapp.in',
    }

    expect(googleOAuthRedirectTo('/login', null, location)).toBe(
      'https://chopsticksspicemalabar.directapp.in/login',
    )
    expect(googleOAuthPreflightUrl('/login', undefined, location)).toBeNull()
  })

  it('hops local tenant subdomains through bare localhost', () => {
    const location = {
      hostname: 'spice-malabar.localhost',
      origin: 'http://spice-malabar.localhost:5173',
      port: '5173',
    }

    expect(googleOAuthRedirectTo('/login', 'spice-malabar', location)).toBe(
      'http://localhost:5173/login?tenant=spice-malabar',
    )
    expect(googleOAuthPreflightUrl('/login', '/cart', location)).toBe(
      'http://localhost:5173/login?tenant=spice-malabar&continue=google&next=%2Fcart',
    )
  })

  it('detects the continue=google hop', () => {
    expect(
      shouldContinueGoogleOAuth('?tenant=spice-malabar&continue=google'),
    ).toBe(true)
    expect(shouldContinueGoogleOAuth('?tenant=spice-malabar')).toBe(false)
  })
})
