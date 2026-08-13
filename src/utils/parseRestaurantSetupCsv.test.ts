import { describe, expect, it } from 'vitest'
import {
  buildRestaurantSetupCsv,
  parseHoursRange,
  parseRestaurantSetupCsv,
  parseSetupTime,
} from '@/utils/parseRestaurantSetupCsv'

describe('parseSetupTime', () => {
  it('parses 24h and 12h times', () => {
    expect(parseSetupTime('11:00')).toBe('11:00')
    expect(parseSetupTime('11:00 AM')).toBe('11:00')
    expect(parseSetupTime('11pm')).toBe('23:00')
    expect(parseSetupTime('12:00 AM')).toBe('00:00')
    expect(parseSetupTime('12 PM')).toBe('12:00')
  })
})

describe('parseHoursRange', () => {
  it('parses owner-friendly ranges', () => {
    expect(parseHoursRange('11:00 AM – 11:00 PM')).toEqual({
      isOpen: true,
      open: '11:00',
      close: '23:00',
    })
    expect(parseHoursRange('10:00-23:30')).toEqual({
      isOpen: true,
      open: '10:00',
      close: '23:30',
    })
    expect(parseHoursRange('Closed')).toEqual({
      isOpen: false,
      open: '00:00',
      close: '00:00',
    })
  })
})

describe('parseRestaurantSetupCsv', () => {
  it('round-trips the template and reads filled values', () => {
    const csv = buildRestaurantSetupCsv({
      restaurantName: 'Spice Garden',
      city: 'Bangalore',
      pincode: '560001',
      hoursWeekdays: '11:00 AM – 11:00 PM',
      delivers: true,
      servicePincodes: ['560001', '560002'],
      deliveryCharge: 49,
      etaMinutes: 40,
      upiId: 'spice@okaxis',
    })

    const result = parseRestaurantSetupCsv(csv)
    expect(result.errors).toEqual([])
    expect(result.values.restaurantName).toBe('Spice Garden')
    expect(result.values.city).toBe('Bangalore')
    expect(result.values.pincode).toBe('560001')
    expect(result.values.delivers).toBe(true)
    expect(result.values.servicePincodes).toEqual(['560001', '560002'])
    expect(result.values.etaMinutes).toBe(40)
    expect(result.values.upiId).toBe('spice@okaxis')
  })

  it('rejects a bad UPI id and missing columns', () => {
    const missing = parseRestaurantSetupCsv('name,example\nrestaurant_name,x')
    expect(missing.errors[0]).toMatch(/field and value/)

    const badUpi = parseRestaurantSetupCsv(
      'field,value\nupi_id,not-an-upi',
    )
    expect(badUpi.errors[0]).toMatch(/upi_id/)
  })
})
