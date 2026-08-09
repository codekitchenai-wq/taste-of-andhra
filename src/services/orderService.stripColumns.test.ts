import { describe, expect, it } from 'vitest'
import { stripMissingOrderColumns } from '@/services/orderService'

describe('stripMissingOrderColumns', () => {
  const base = {
    organization_id: 'org-1',
    delivery_provider: 'own',
    delivery_quote_id: 'quote-1',
    branch_id: 'branch-1',
    total: 175,
  }

  it('removes organization_id when PostgREST reports it missing', () => {
    const next = stripMissingOrderColumns(
      base,
      "Could not find the 'organization_id' column of 'orders' in the schema cache",
    )

    expect(next).toEqual({
      delivery_provider: 'own',
      delivery_quote_id: 'quote-1',
      branch_id: 'branch-1',
      total: 175,
    })
    expect('organization_id' in next).toBe(false)
  })

  it('removes delivery provider columns when reported missing', () => {
    const next = stripMissingOrderColumns(
      base,
      "Could not find the 'delivery_provider' column of 'orders' in the schema cache",
    )

    expect(next.organization_id).toBe('org-1')
    expect(next.branch_id).toBe('branch-1')
    expect('delivery_provider' in next).toBe(false)
    expect('delivery_quote_id' in next).toBe(false)
  })

  it('removes whatsapp_updates_opt_in when reported missing', () => {
    const next = stripMissingOrderColumns(
      { ...base, whatsapp_updates_opt_in: true },
      "Could not find the 'whatsapp_updates_opt_in' column of 'orders' in the schema cache",
    )

    expect('whatsapp_updates_opt_in' in next).toBe(false)
    expect(next.total).toBe(175)
  })
})
