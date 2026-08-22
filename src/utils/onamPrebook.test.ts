import { describe, expect, it } from 'vitest'
import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import {
  clampOnamPlates,
  onamScheduledAt,
  onamTimeSlots,
  onamWhatsAppMessage,
  parseOnamPrebook,
} from './onamPrebook'

describe('onamTimeSlots', () => {
  it('covers 11 AM to 9 PM in hourly windows', () => {
    const slots = onamTimeSlots()
    expect(slots[0]).toEqual({ value: '11:00', label: '11:00 AM – 12:00 PM' })
    expect(slots.at(-1)).toEqual({ value: '20:00', label: '8:00 PM – 9:00 PM' })
    expect(slots).toHaveLength(10)
  })
})

describe('parseOnamPrebook', () => {
  it('accepts a valid parcel booking', () => {
    expect(
      parseOnamPrebook({
        service: 'parcel',
        date: '2026-08-25',
        slot: '13:00',
        plates: 4,
        comments: 'Gate 2',
      }),
    ).toEqual({
      service: 'parcel',
      date: '2026-08-25',
      slot: '13:00',
      plates: 4,
      comments: 'Gate 2',
    })
  })

  it('maps legacy customerName into comments', () => {
    expect(
      parseOnamPrebook({
        service: 'parcel',
        date: '2026-08-25',
        slot: '13:00',
        plates: 2,
        customerName: 'Anu',
      }),
    ).toMatchObject({ comments: 'Anu' })
  })

  it('treats a saved dine-in booking as parcel', () => {
    expect(
      parseOnamPrebook({
        service: 'dine_in',
        date: '2026-08-25',
        slot: '13:00',
        plates: 2,
      }),
    ).toMatchObject({ service: 'parcel' })
  })

  it('rejects unknown dates', () => {
    expect(
      parseOnamPrebook({
        service: 'parcel',
        date: '2026-08-24',
        slot: '13:00',
        plates: 2,
      }),
    ).toBeNull()
  })
})

describe('onamWhatsAppMessage', () => {
  it('includes plates, slot, parcel price, and comments', () => {
    const message = onamWhatsAppMessage({
      service: 'parcel',
      date: '2026-08-26',
      slot: '18:00',
      plates: 3,
      comments: 'Less spicy',
    })
    expect(message).toContain('Less spicy')
    expect(message).toContain('3 plate')
    expect(message).toContain('6:00 PM – 7:00 PM')
    expect(message).toContain(`₹${ONAM_SADHYA.services.parcel.price}`)
  })
})

describe('onamScheduledAt', () => {
  it('builds an IST timestamp', () => {
    expect(onamScheduledAt('2026-08-25', '14:00')).toBe(
      new Date('2026-08-25T14:00:00+05:30').toISOString(),
    )
  })
})

describe('clampOnamPlates', () => {
  it('keeps plates in range', () => {
    expect(clampOnamPlates(0)).toBe(1)
    expect(clampOnamPlates(80)).toBe(50)
    expect(clampOnamPlates(3.6)).toBe(4)
  })
})
