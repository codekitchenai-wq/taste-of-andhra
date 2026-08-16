import { describe, expect, it } from 'vitest'
import { PLATFORM_WWW_URL } from '@/constants/PLATFORM'
import { canonicalHostRedirectUrl } from './canonicalHost'

describe('canonicalHostRedirectUrl', () => {
  it('redirects the production Vercel alias to the custom domain', () => {
    expect(
      canonicalHostRedirectUrl({
        hostname: 'taste-of-andhra.vercel.app',
        pathname: '/checkout',
        search: '?from=cart',
        hash: '#summary',
      }),
    ).toBe(`${PLATFORM_WWW_URL}/checkout?from=cart#summary`)
  })

  it('does not redirect the custom domain, previews, or localhost', () => {
    expect(
      canonicalHostRedirectUrl({
        hostname: 'www.directapp.in',
        pathname: '/menu',
      }),
    ).toBeNull()
    expect(
      canonicalHostRedirectUrl({
        hostname: 'taste-of-andhra-git-main-team.vercel.app',
        pathname: '/',
      }),
    ).toBeNull()
    expect(
      canonicalHostRedirectUrl({
        hostname: 'localhost',
        pathname: '/checkout',
      }),
    ).toBeNull()
  })
})
