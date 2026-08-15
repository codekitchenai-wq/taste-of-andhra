import { describe, expect, it } from 'vitest'
import { pidgeWebhookUrl } from './deliveryQuoteService'

describe('pidgeWebhookUrl', () => {
  it('returns the pidge-webhook path when a Supabase URL is configured', () => {
    const url = pidgeWebhookUrl()
    if (!url) {
      expect(url).toBeNull()
      return
    }

    expect(url.startsWith('https://')).toBe(true)
    expect(url.endsWith('/functions/v1/pidge-webhook')).toBe(true)
  })
})
