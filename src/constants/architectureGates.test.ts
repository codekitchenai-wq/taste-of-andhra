import { describe, expect, it } from 'vitest'
import {
  ENABLE_AI,
  ENABLE_HOST_TENANT_RESOLUTION,
  ENABLE_META_EMBEDDED_SIGNUP,
  ENABLE_RAZORPAY_ROUTE,
  ENABLE_SCOPED_ORG_ADMIN_AUTH,
  ENABLE_STARTER_ONBOARDING,
  ENABLE_TASTE_OF_ANDHRA_CUSTOM_DOMAIN,
} from '@/constants/ARCHITECTURE_GATES'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { mapPayment } from '@/utils/mapPayment'

describe('architecture gates defaults', () => {
  it('keeps unfinished capabilities held (off) by default', () => {
    expect(ENABLE_RAZORPAY_ROUTE).toBe(false)
    expect(ENABLE_META_EMBEDDED_SIGNUP).toBe(false)
    expect(ENABLE_AI).toBe(false)
    expect(ENABLE_TASTE_OF_ANDHRA_CUSTOM_DOMAIN).toBe(false)
  })

  it('enables Website Starter onboarding UI by default (isolated via plan)', () => {
    expect(ENABLE_STARTER_ONBOARDING).toBe(true)
  })

  it('scopes admin and delivery logins to the current restaurant', () => {
    expect(ENABLE_SCOPED_ORG_ADMIN_AUTH).toBe(true)
  })

  it('reads host tenant resolution from env when set', () => {
    expect(typeof ENABLE_HOST_TENANT_RESOLUTION).toBe('boolean')
  })

  it('keeps Taste of Andhra as default organization', () => {
    expect(DEFAULT_ORGANIZATION_ID).toBe(
      'a0000000-0000-4000-8000-000000000001',
    )
  })
})

describe('mapPayment architecture fields', () => {
  it('maps provider mode and org without breaking legacy rows', () => {
    const payment = mapPayment({
      id: 'p1',
      order_id: 'o1',
      organization_id: DEFAULT_ORGANIZATION_ID,
      payment_gateway: 'razorpay',
      provider: 'razorpay',
      payment_mode: 'DIRECT',
      provider_payment_id: 'pay_123',
      transaction_id: 'pay_123',
      amount: 100,
      status: 'paid',
      paid_at: null,
      created_at: '2026-01-01T00:00:00Z',
    })

    expect(payment.organization_id).toBe(DEFAULT_ORGANIZATION_ID)
    expect(payment.payment_mode).toBe('DIRECT')
    expect(payment.provider_payment_id).toBe('pay_123')
  })
})
