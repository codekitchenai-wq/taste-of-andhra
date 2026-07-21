import { describe, expect, it } from 'vitest'
import { calculateOrderTotals } from './orderTotals'

describe('calculateOrderTotals', () => {
  it('calculates tax at 5% and delivery below free threshold', () => {
    const result = calculateOrderTotals(300)

    expect(result.subtotal).toBe(300)
    expect(result.tax).toBe(15)
    expect(result.deliveryCharge).toBe(49)
    expect(result.discount).toBe(0)
    expect(result.total).toBe(364)
  })

  it('waives delivery at or above ₹399', () => {
    const atThreshold = calculateOrderTotals(399)
    expect(atThreshold.deliveryCharge).toBe(0)
    expect(atThreshold.total).toBe(418.95)

    const aboveThreshold = calculateOrderTotals(500)
    expect(aboveThreshold.deliveryCharge).toBe(0)
    expect(aboveThreshold.tax).toBe(25)
    expect(aboveThreshold.total).toBe(525)
  })

  it('applies discount before computing total', () => {
    const result = calculateOrderTotals(500, 50)

    expect(result.discount).toBe(50)
    expect(result.tax).toBe(25)
    expect(result.deliveryCharge).toBe(0)
    expect(result.total).toBe(475)
  })

  it('rounds tax to two decimal places', () => {
    const result = calculateOrderTotals(123)

    expect(result.tax).toBe(6.15)
    expect(result.total).toBe(178.15)
  })

  it('handles zero subtotal', () => {
    const result = calculateOrderTotals(0)

    expect(result.tax).toBe(0)
    expect(result.deliveryCharge).toBe(49)
    expect(result.total).toBe(49)
  })
})
