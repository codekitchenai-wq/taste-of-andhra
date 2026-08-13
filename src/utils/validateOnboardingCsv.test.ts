import { describe, expect, it } from 'vitest'
import { buildRestaurantSetupCsv } from '@/utils/parseRestaurantSetupCsv'
import { validateOnboardingCsv } from '@/utils/validateOnboardingCsv'

describe('validateOnboardingCsv', () => {
  it('rejects Excel workbooks', () => {
    const result = validateOnboardingCsv('setup', 'field,value\n', 'setup.xlsx')
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/Save As → CSV/)
  })

  it('accepts a filled setup template', () => {
    const csv = buildRestaurantSetupCsv({
      restaurantName: 'Spice Garden',
      city: 'Bangalore',
      pincode: '560001',
    })
    const result = validateOnboardingCsv('setup', csv, 'setup.csv')
    expect(result.ok).toBe(true)
    expect(result.summary).toMatch(/ready/)
  })

  it('flags menu rows with bad prices', () => {
    const csv = `category,name,price,is_veg
Starters,Paneer Tikka,not-a-price,TRUE`
    const result = validateOnboardingCsv('menu', csv, 'menu.csv')
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatch(/price/)
  })
})
