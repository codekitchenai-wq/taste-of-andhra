import { describe, expect, it } from 'vitest'
import { getPartnerEtaDisplay } from '@/utils/partnerEta'

const now = Date.parse('2026-08-13T12:00:00.000Z')
const fresh = '2026-08-13T11:59:30.000Z'
const stale = '2026-08-13T11:50:00.000Z'
const dropoff = { dropoffLat: 12.99, dropoffLng: 77.61 }
const nearby = { partnerLat: 12.9716, partnerLng: 77.5946 }
const atDoor = { partnerLat: 12.99, partnerLng: 77.61 }

describe('partner tracking scenarios', () => {
  it('S1 cancelled: no rider ETA', () => {
    const eta = getPartnerEtaDisplay({
      ...nearby,
      ...dropoff,
      orderStatus: 'cancelled',
      nowMs: now,
    })
    expect(eta.customerLabel).toBeNull()
  })

  it('S2 delivered without GPS: delivered copy, no live minutes', () => {
    const eta = getPartnerEtaDisplay({
      partnerLat: null,
      partnerLng: null,
      ...dropoff,
      orderStatus: 'delivered',
      nowMs: now,
    })
    expect(eta.shortLabel).toBe('Delivered')
    expect(eta.minutes).toBeNull()
    expect(eta.customerLabel).toBe('Your order has been delivered.')
  })

  it('S2 delivered: delivered copy, no live minutes', () => {
    const eta = getPartnerEtaDisplay({
      ...nearby,
      ...dropoff,
      locationUpdatedAt: fresh,
      orderStatus: 'delivered',
      nowMs: now,
    })
    expect(eta.shortLabel).toBe('Delivered')
    expect(eta.minutes).toBeNull()
  })

  it('S3 out for delivery without GPS: no label (UI shows waiting)', () => {
    const eta = getPartnerEtaDisplay({
      partnerLat: null,
      partnerLng: null,
      ...dropoff,
      orderStatus: 'out_for_delivery',
      nowMs: now,
    })
    expect(eta.hasFix).toBe(false)
    expect(eta.customerLabel).toBeNull()
  })

  it('S4 live GPS with drop-off: minutes away', () => {
    const eta = getPartnerEtaDisplay({
      ...nearby,
      ...dropoff,
      locationUpdatedAt: fresh,
      orderStatus: 'out_for_delivery',
      nowMs: now,
    })
    expect(eta.hasFix).toBe(true)
    expect(eta.minutes).toBeGreaterThan(0)
    expect(eta.isStale).toBe(false)
    expect(eta.customerLabel).toMatch(/Partner is about \d+ min away/)
  })

  it('S5 stale GPS: delayed warning', () => {
    const eta = getPartnerEtaDisplay({
      ...nearby,
      ...dropoff,
      locationUpdatedAt: stale,
      orderStatus: 'out_for_delivery',
      nowMs: now,
    })
    expect(eta.isStale).toBe(true)
    expect(eta.customerLabel).toMatch(/may be delayed/)
  })

  it('S6 at drop-off: arriving now', () => {
    const eta = getPartnerEtaDisplay({
      ...atDoor,
      ...dropoff,
      locationUpdatedAt: fresh,
      orderStatus: 'out_for_delivery',
      nowMs: now,
    })
    expect(eta.isArriving).toBe(true)
    expect(eta.customerLabel).toBe('Partner is arriving now.')
  })

  it('S7 GPS without address pin: live without minutes', () => {
    const eta = getPartnerEtaDisplay({
      ...nearby,
      dropoffLat: null,
      dropoffLng: null,
      locationUpdatedAt: fresh,
      orderStatus: 'out_for_delivery',
      nowMs: now,
    })
    expect(eta.hasFix).toBe(true)
    expect(eta.minutes).toBeNull()
    expect(eta.customerLabel).toMatch(/Address pin is not available/)
  })

  it('S8 preparing with GPS still computes if asked (UI hides live minutes until dispatch)', () => {
    const eta = getPartnerEtaDisplay({
      ...nearby,
      ...dropoff,
      locationUpdatedAt: fresh,
      orderStatus: 'preparing',
      nowMs: now,
    })
    expect(eta.hasFix).toBe(true)
    expect(eta.minutes).toBeGreaterThan(0)
  })
})
