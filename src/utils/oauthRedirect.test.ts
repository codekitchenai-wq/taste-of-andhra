import { describe, expect, it } from 'vitest'
import {
  googleOAuthPreflightUrl,
  googleOAuthRedirectTo,
  shouldContinueGoogleOAuth,
} from './oauthRedirect'

describe('google OAuth redirect', () => {
  it('hops production tenant subdomains through www with tenant in redirectTo', () => {
    const location = {
      hostname: 'chopsticksspicemalabar.directapp.in',
      origin: 'https://chopsticksspicemalabar.directapp.in',
    }

    expect(googleOAuthRedirectTo('/login', null, location)).toBe(
      'https://www.directapp.in/login?tenant=chopsticksspicemalabar',
    )
    expect(googleOAuthPreflightUrl('/login', undefined, location)).toBe(
      'https://www.directapp.in/login?tenant=chopsticksspicemalabar&continue=google',
    )
  })

  it('does not preflight when already on the platform callback host', () => {
    const location = {
      hostname: 'www.directapp.in',
      origin: 'https://www.directapp.in',
    }

    expect(
      googleOAuthRedirectTo('/login', 'chopsticksspicemalabar', location),
    ).toBe('https://www.directapp.in/login?tenant=chopsticksspicemalabar')
    expect(
      googleOAuthPreflightUrl(
        '/login',
        undefined,
        location,
        'chopsticksspicemalabar',
      ),
    ).toBeNull()
  })

  it('hops Taste of Andhra custom domain through www so Spice Malabar is not lost', () => {
    const location = {
      hostname: 'www.thetasteofandhra.com',
      origin: 'https://www.thetasteofandhra.com',
    }

    expect(
      googleOAuthPreflightUrl(
        '/login',
        undefined,
        location,
        'chopsticksspicemalabar',
      ),
    ).toBe(
      'https://www.directapp.in/login?tenant=chopsticksspicemalabar&continue=google',
    )
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
