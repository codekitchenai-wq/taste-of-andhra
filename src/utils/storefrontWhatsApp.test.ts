import { describe, expect, it } from 'vitest'
import type { StorefrontContact } from '@/utils/storefrontCopy'
import {
  cartWhatsAppMessage,
  contactWhatsAppMessage,
  generalOrderWhatsAppMessage,
  generalOrderWhatsAppUrl,
  storefrontWhatsAppPhone,
  storefrontWhatsAppUrl,
} from './storefrontWhatsApp'

const contact: StorefrontContact = {
  name: 'Spice Malabar',
  tagline: 'Kerala',
  description: 'Test',
  phone: '+91 78418 22215',
  alternatePhone: null,
  phones: ['+91 78418 22215'],
  email: null,
  address: 'Pune',
  mapsUrl: 'https://maps.example',
  weekdayHours: '11–11',
  weekendHours: '11–11',
}

describe('storefrontWhatsAppPhone', () => {
  it('normalizes Indian mobile from contact', () => {
    expect(storefrontWhatsAppPhone(contact)).toBe('7841822215')
  })
})

describe('storefrontWhatsAppUrl', () => {
  it('builds wa.me link with encoded message', () => {
    const url = storefrontWhatsAppUrl(contact, 'Hello')
    expect(url).toContain('https://wa.me/917841822215')
    expect(url).toContain('text=Hello')
  })
})

describe('generalOrderWhatsAppMessage', () => {
  it('includes restaurant name and menu link', () => {
    const message = generalOrderWhatsAppMessage(
      contact,
      'https://spice-malabar.directapp.in/menu',
    )
    expect(message).toContain('Spice Malabar')
    expect(message).toContain('/menu')
  })
})

describe('cartWhatsAppMessage', () => {
  it('lists cart lines and subtotal', () => {
    const message = cartWhatsAppMessage(contact, {
      id: 'c1',
      user_id: 'u1',
      created_at: '',
      updated_at: '',
      subtotal: 720,
      items: [
        {
          id: 'i1',
          cart_id: 'c1',
          dish_id: 'd1',
          quantity: 2,
          unit_price: 360,
          modifiers_snapshot: [],
          created_at: '',
          dish: {
            id: 'd1',
            organization_id: 'o1',
            category_id: 'cat',
            name: 'Onam Sadhya',
            slug: 'onam',
            description: null,
            ingredients: null,
            price: 360,
            calories: null,
            spice_level: null,
            preparation_time: null,
            image_url: null,
            is_veg: true,
            is_available: true,
            is_featured: false,
            rating: null,
            created_at: '',
            updated_at: '',
          },
        },
      ],
    })
    expect(message).toContain('2× Onam Sadhya')
    expect(message).toContain('₹720')
  })
})

describe('contactWhatsAppMessage', () => {
  it('formats a contact enquiry', () => {
    expect(
      contactWhatsAppMessage('Spice Malabar', {
        name: 'Anu',
        subject: 'Catering',
        message: 'Need sadhya for 20 people.',
      }),
    ).toContain('Anu')
  })
})

describe('generalOrderWhatsAppUrl', () => {
  it('uses provided menu url', () => {
    const url = generalOrderWhatsAppUrl(
      contact,
      'https://example.com/menu',
    )
    expect(url).toContain('wa.me/91')
    expect(decodeURIComponent(url)).toContain('example.com/menu')
  })
})
