import { describe, expect, it } from 'vitest'
import type { CommunicationSendRequest } from '@/types/Communication'
import { buildCommunicationIdempotencyKey } from '@/utils/communicationEvents'

describe('CommunicationSendRequest shape', () => {
  it('is provider-neutral (no gupshup/meta fields)', () => {
    const request: CommunicationSendRequest = {
      organizationId: 'org-1',
      customerId: 'user-1',
      orderId: 'order-1',
      channel: 'whatsapp',
      eventType: 'ORDER_CONFIRMED',
      recipient: '+919876543210',
      templateKey: 'order_confirmed',
      variables: {
        orderNumber: '1254',
        restaurantName: 'Taste of Andhra',
        amount: '420',
      },
      idempotencyKey: buildCommunicationIdempotencyKey({
        orderId: 'order-1',
        eventType: 'ORDER_CONFIRMED',
        channel: 'whatsapp',
      }),
    }

    const keys = Object.keys(request)
    expect(keys).not.toContain('apiKey')
    expect(keys).not.toContain('accessToken')
    expect(keys).not.toContain('wabaId')
    expect(keys).not.toContain('gupshup')
    expect(request.eventType).toBe('ORDER_CONFIRMED')
    expect(request.idempotencyKey).toBe('order-1:ORDER_CONFIRMED:whatsapp')
  })
})
