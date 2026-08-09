import { describe, expect, it } from 'vitest'
import {
  buildCommunicationIdempotencyKey,
  communicationRetryBackoffMinutes,
  isPermanentCommunicationError,
  orderStatusToCommunicationEvent,
} from './communicationEvents'

describe('orderStatusToCommunicationEvent', () => {
  it('maps known order statuses to internal events', () => {
    expect(orderStatusToCommunicationEvent('pending')).toBe('ORDER_CREATED')
    expect(orderStatusToCommunicationEvent('confirmed')).toBe('ORDER_CONFIRMED')
    expect(orderStatusToCommunicationEvent('preparing')).toBe('ORDER_PREPARING')
    expect(orderStatusToCommunicationEvent('ready')).toBe('ORDER_READY')
    expect(orderStatusToCommunicationEvent('out_for_delivery')).toBe(
      'ORDER_OUT_FOR_DELIVERY',
    )
    expect(orderStatusToCommunicationEvent('delivered')).toBe('ORDER_DELIVERED')
    expect(orderStatusToCommunicationEvent('cancelled')).toBe('ORDER_CANCELLED')
  })

  it('uppercases unknown statuses without provider-specific ids', () => {
    expect(orderStatusToCommunicationEvent('custom status')).toBe(
      'CUSTOM_STATUS',
    )
  })
})

describe('buildCommunicationIdempotencyKey', () => {
  it('uses order + event + channel', () => {
    expect(
      buildCommunicationIdempotencyKey({
        orderId: 'order-1',
        eventType: 'ORDER_CONFIRMED',
        channel: 'whatsapp',
      }),
    ).toBe('order-1:ORDER_CONFIRMED:whatsapp')
  })

  it('keeps channels distinct for the same event', () => {
    const wa = buildCommunicationIdempotencyKey({
      orderId: 'o1',
      eventType: 'ORDER_CONFIRMED',
      channel: 'whatsapp',
    })
    const sms = buildCommunicationIdempotencyKey({
      orderId: 'o1',
      eventType: 'ORDER_CONFIRMED',
      channel: 'sms',
    })
    expect(wa).not.toBe(sms)
  })
})

describe('isPermanentCommunicationError', () => {
  it('treats invalid phone/template/auth as permanent', () => {
    expect(isPermanentCommunicationError('invalid_phone')).toBe(true)
    expect(isPermanentCommunicationError('invalid_template')).toBe(true)
    expect(isPermanentCommunicationError('unauthorized')).toBe(true)
    expect(isPermanentCommunicationError('blocked_recipient')).toBe(true)
  })

  it('does not treat timeouts as permanent', () => {
    expect(isPermanentCommunicationError('timeout')).toBe(false)
    expect(isPermanentCommunicationError(null)).toBe(false)
  })
})

describe('communicationRetryBackoffMinutes', () => {
  it('uses exponential backoff capped at 60', () => {
    expect(communicationRetryBackoffMinutes(1)).toBe(1)
    expect(communicationRetryBackoffMinutes(2)).toBe(2)
    expect(communicationRetryBackoffMinutes(3)).toBe(4)
    expect(communicationRetryBackoffMinutes(10)).toBe(60)
  })
})
