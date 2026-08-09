import { describe, expect, it } from 'vitest'
import {
  canTransitionOrderStatus,
  getAllowedNextStatuses,
  getOrderStatusTransitionError,
} from './orderStatusTransitions'

describe('orderStatusTransitions', () => {
  it('allows the kitchen sequence one step at a time', () => {
    expect(canTransitionOrderStatus('pending', 'confirmed')).toBe(true)
    expect(canTransitionOrderStatus('confirmed', 'preparing')).toBe(true)
    expect(canTransitionOrderStatus('preparing', 'ready')).toBe(true)
    expect(canTransitionOrderStatus('ready', 'out_for_delivery')).toBe(true)
    expect(canTransitionOrderStatus('out_for_delivery', 'delivered')).toBe(true)
  })

  it('blocks skipping ahead to out for delivery', () => {
    expect(canTransitionOrderStatus('confirmed', 'out_for_delivery')).toBe(
      false,
    )
    expect(canTransitionOrderStatus('preparing', 'out_for_delivery')).toBe(
      false,
    )
    expect(getOrderStatusTransitionError('preparing', 'out_for_delivery')).toMatch(
      /Ready/,
    )
  })

  it('exposes only the next allowed statuses', () => {
    expect(getAllowedNextStatuses('ready')).toEqual([
      'out_for_delivery',
      'cancelled',
    ])
    expect(getAllowedNextStatuses('delivered')).toEqual([])
  })

  it('lets pickup orders go ready → delivered', () => {
    expect(canTransitionOrderStatus('ready', 'delivered', 'pickup')).toBe(true)
    expect(canTransitionOrderStatus('ready', 'out_for_delivery', 'pickup')).toBe(
      false,
    )
    expect(getAllowedNextStatuses('ready', 'pickup')).toEqual([
      'delivered',
      'cancelled',
    ])
  })
})
