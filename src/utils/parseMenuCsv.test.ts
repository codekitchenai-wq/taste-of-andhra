import { describe, expect, it } from 'vitest'
import { parseMenuCsv } from '@/utils/parseMenuCsv'

describe('parseMenuCsv', () => {
  it('parses the onboarding template rows', () => {
    const csv = `category,name,price,is_veg,spice_level,description,preparation_time_minutes,is_available,is_featured,display_order
Starters,Paneer Tikka,249,TRUE,medium,Grilled cottage cheese,20,TRUE,TRUE,1
Starters,Chicken 65,₹280,FALSE,hot,Spicy fried chicken,25,TRUE,FALSE,2`

    const result = parseMenuCsv(csv)
    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].name).toBe('Paneer Tikka')
    expect(result.rows[0].isVeg).toBe(true)
    expect(result.rows[1].price).toBe(280)
    expect(result.rows[1].isVeg).toBe(false)
  })

  it('rejects missing required columns', () => {
    const result = parseMenuCsv('name,price\nTea,40')
    expect(result.rows).toHaveLength(0)
    expect(result.errors[0]).toMatch(/Missing required columns/)
  })
})
