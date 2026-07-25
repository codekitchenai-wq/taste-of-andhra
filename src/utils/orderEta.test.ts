import { describe, expect, it } from 'vitest'
import {
  addMinutesToIso,
  getEtaDisplay,
  getRemainingMs,
  isOrderDelayed,
} from '@/utils/orderEta'

describe('orderEta', () => {
  const now = Date.parse('2026-07-26T10:00:00.000Z')

  it('adds minutes to an ISO timestamp', () => {
    expect(addMinutesToIso('2026-07-26T10:00:00.000Z', 45)).toBe(
      '2026-07-26T10:45:00.000Z',
    )
  })

  it('detects delayed active orders', () => {
    expect(
      isOrderDelayed(
        {
          estimated_delivery: '2026-07-26T09:50:00.000Z',
          order_status: 'preparing',
        },
        now,
      ),
    ).toBe(true)

    expect(
      isOrderDelayed(
        {
          estimated_delivery: '2026-07-26T09:50:00.000Z',
          order_status: 'delivered',
        },
        now,
      ),
    ).toBe(false)
  })

  it('formats remaining and overdue labels', () => {
    expect(
      getEtaDisplay('2026-07-26T10:32:00.000Z', 'out_for_delivery', now)
        .shortLabel,
    ).toBe('32m left')

    expect(
      getEtaDisplay('2026-07-26T09:40:00.000Z', 'preparing', now).shortLabel,
    ).toBe('Overdue 20m')

    expect(getRemainingMs('2026-07-26T10:05:00.000Z', now)).toBe(5 * 60_000)
  })
})
