import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  googleOAuthPreflightUrl,
  googleOAuthRedirectTo,
  shouldContinueGoogleOAuth,
} from './oauthRedirect'

describe('google OAuth redirect', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps production tenant origin', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'chopsticksspicemalabar.directapp.in',
        port: '',
        origin: 'https://chopsticksspicemalabar.directapp.in',
        search: '',
      },
    })
    expect(googleOAuthRedirectTo('/login')).toBe(
      'https://chopsticksspicemalabar.directapp.in/login',
    )
    expect(googleOAuthPreflightUrl('/login')).toBeNull()
  })

  it('rewrites {slug}.localhost to localhost for the allowlist', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'spice-malabar.localhost',
        port: '5173',
        origin: 'http://spice-malabar.localhost:5173',
        search: '',
      },
    })
    expect(googleOAuthRedirectTo('/login')).toBe(
      'http://localhost:5173/login?tenant=spice-malabar',
    )
    expect(googleOAuthPreflightUrl('/login', '/cart')).toBe(
      'http://localhost:5173/login?tenant=spice-malabar&continue=google&next=%2Fcart',
    )
  })

  it('detects the continue=google hop', () => {
    expect(shouldContinueGoogleOAuth('?tenant=spice-malabar&continue=google')).toBe(
      true,
    )
    expect(shouldContinueGoogleOAuth('?tenant=spice-malabar')).toBe(false)
  })
})
