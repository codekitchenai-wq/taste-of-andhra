import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recoverOAuthTenantHostIfNeeded } from './oauthHandoff'

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
})
