import { describe, expect, it } from 'vitest'
import {
  estimateTravelMinutes,
  getPartnerEtaDisplay,
  isLocationStale,
} from '@/utils/partnerEta'

describe('partnerEta', () => {
  const now = Date.parse('2026-08-13T12:00:00.000Z')

  it('estimates minutes from distance using city speed and road factor', () => {
    // 2 km * 1.3 / 20 km/h * 60 = 7.8 → 8
    expect(estimateTravelMinutes(2)).toBe(8)
    expect(estimateTravelMinutes(0)).toBe(0)
  })

  it('flags GPS older than two minutes as stale', () => {
    expect(isLocationStale('2026-08-13T11:57:00.000Z', now)).toBe(true)
    expect(isLocationStale('2026-08-13T11:59:00.000Z', now)).toBe(false)
  })

  it('returns arriving when the partner is at the drop-off', () => {
    const eta = getPartnerEtaDisplay({
      partnerLat: 12.9716,
      partnerLng: 77.5946,
      dropoffLat: 12.9716,
      dropoffLng: 77.5946,
      locationUpdatedAt: '2026-08-13T11:59:30.000Z',
      orderStatus: 'out_for_delivery',
      nowMs: now,
    })

    expect(eta.isArriving).toBe(true)
    expect(eta.shortLabel).toBe('Arriving')
  })

  it('shows minutes away for a nearby live fix', () => {
    const eta = getPartnerEtaDisplay({
      partnerLat: 12.9716,
      partnerLng: 77.5946,
      dropoffLat: 12.99,
      dropoffLng: 77.61,
      locationUpdatedAt: '2026-08-13T11:59:30.000Z',
      orderStatus: 'out_for_delivery',
      nowMs: now,
    })

    expect(eta.hasFix).toBe(true)
    expect(eta.minutes).toBeGreaterThan(0)
    expect(eta.customerLabel).toMatch(/min away/)
    expect(eta.isStale).toBe(false)
  })

  it('returns no label when GPS is missing', () => {
    const eta = getPartnerEtaDisplay({
      partnerLat: null,
      partnerLng: null,
      dropoffLat: 12.97,
      dropoffLng: 77.59,
      orderStatus: 'out_for_delivery',
      nowMs: now,
    })

    expect(eta.hasFix).toBe(false)
    expect(eta.customerLabel).toBeNull()
  })
})
