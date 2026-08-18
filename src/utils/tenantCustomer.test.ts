import { describe, expect, it } from 'vitest'
import { applyTenantCustomerCapture } from './tenantCustomer'
import type { Profile } from '@/types/Profile'

const profile: Profile = {
  id: 'user-1',
  full_name: 'Google Name',
  email: 'shared@gmail.com',
  phone: '9000000001',
  role: 'customer',
  avatar_url: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

describe('applyTenantCustomerCapture', () => {
  it('keeps this restaurant’s name and phone instead of the shared Google profile', () => {
    expect(
      applyTenantCustomerCapture(profile, {
        full_name: 'Spice Guest',
        phone: '9888888888',
        email: 'spice@example.com',
      }),
    ).toMatchObject({
      full_name: 'Spice Guest',
      phone: '9888888888',
      email: 'spice@example.com',
    })
  })

  it('falls back to the login profile when this restaurant has no capture yet', () => {
    expect(applyTenantCustomerCapture(profile, {})).toEqual(profile)
  })
})
