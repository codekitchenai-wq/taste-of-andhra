import { describe, expect, it } from 'vitest'
import {
  DEMO_PASSWORD,
  MASTER_ACCOUNT,
  accountsForRole,
  demoEmailSlug,
  demoPersonaEmail,
  primaryAccountForRole,
  tenantPersonaAccounts,
} from '@/constants/DEMO_ACCOUNTS'
import { evaluateTenantAccess } from '@/utils/tenantAccess'
import { UNMATCHED_ORGANIZATION_ID } from '@/constants/ORGANIZATION'

describe('demo persona emails', () => {
  it('uses tasteofandhra for the Taste of Andhra slug', () => {
    expect(demoEmailSlug('thetasteofandhra')).toBe('tasteofandhra')
    expect(demoPersonaEmail('thetasteofandhra', 'admin')).toBe(
      'demoadmin@tasteofandhra.test',
    )
    expect(demoPersonaEmail('thetasteofandhra', 'customer')).toBe(
      'democustomer@tasteofandhra.test',
    )
    expect(demoPersonaEmail('thetasteofandhra', 'delivery')).toBe(
      'demodelivery@tasteofandhra.test',
    )
  })

  it('uses the restaurant slug for other tenants', () => {
    expect(demoPersonaEmail('chopsticksspicemalabar', 'admin')).toBe(
      'demoadmin@chopsticksspicemalabar.test',
    )
    expect(demoPersonaEmail('spice-malabar', 'admin')).toBe(
      'demoadmin@chopsticksspicemalabar.test',
    )
  })

  it('scopes login helpers to the current tenant', () => {
    expect(primaryAccountForRole('admin', 'thetasteofandhra').email).toBe(
      'demoadmin@tasteofandhra.test',
    )
    expect(primaryAccountForRole('admin', 'chopsticksspicemalabar').email).toBe(
      'demoadmin@chopsticksspicemalabar.test',
    )
    expect(MASTER_ACCOUNT.password).toBe(DEMO_PASSWORD)
    expect(tenantPersonaAccounts({ slug: 'devihomefoods' })).toHaveLength(3)
  })

  it('lists Chopsticks roster delivery logins for QA', () => {
    const delivery = accountsForRole('delivery', 'chopsticksspicemalabar')
    expect(delivery.map((account) => account.email)).toEqual([
      'demodelivery@chopsticksspicemalabar.test',
      '7760071234@chopsticksspicemalabar.test',
    ])
    expect(delivery.every((account) => account.password === DEMO_PASSWORD)).toBe(
      true,
    )
  })
})

describe('evaluateTenantAccess', () => {
  const orgA = 'org-a'
  const orgB = 'org-b'

  it('allows platform master everywhere', () => {
    expect(
      evaluateTenantAccess({
        role: 'platform_master',
        organizationId: orgA,
        memberOrgIds: [],
        customerOrgIds: [],
      }).allowed,
    ).toBe(true)
  })

  it('allows staff only on their restaurant', () => {
    expect(
      evaluateTenantAccess({
        role: 'admin',
        organizationId: orgA,
        memberOrgIds: [orgA],
        customerOrgIds: [],
      }).allowed,
    ).toBe(true)
    expect(
      evaluateTenantAccess({
        role: 'admin',
        organizationId: orgB,
        memberOrgIds: [orgA],
        customerOrgIds: [],
      }).allowed,
    ).toBe(false)
  })

  it('blocks a demo customer from another restaurant', () => {
    expect(
      evaluateTenantAccess({
        role: 'customer',
        organizationId: orgB,
        memberOrgIds: [],
        customerOrgIds: [orgA],
      }).allowed,
    ).toBe(false)
  })

  it('allows a new customer with no enrollments to join', () => {
    expect(
      evaluateTenantAccess({
        role: 'customer',
        organizationId: orgA,
        memberOrgIds: [],
        customerOrgIds: [],
      }).allowed,
    ).toBe(true)
  })

  it('rejects unmatched restaurants', () => {
    expect(
      evaluateTenantAccess({
        role: 'admin',
        organizationId: UNMATCHED_ORGANIZATION_ID,
        memberOrgIds: [orgA],
        customerOrgIds: [],
      }).allowed,
    ).toBe(false)
  })
})
