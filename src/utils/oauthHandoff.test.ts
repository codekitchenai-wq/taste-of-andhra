import { describe, expect, it } from 'vitest'
import { tenantSessionHandoffUrl } from './oauthHandoff'

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
      'https://chopsticksspicemalabar.directapp.in/login?tenant=chopsticksspicemalabar&next=%2Fonam#access_token=tok&refresh_token=ref&token_type=bearer&type=recovery',
    )
  })
})
