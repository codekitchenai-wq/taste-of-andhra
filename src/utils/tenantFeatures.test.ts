import { describe, expect, it } from 'vitest'
import { TASTE_OF_ANDHRA_ORG_ID } from '@/constants/ORGANIZATION'
import {
  isDefaultAndhraTenant,
  parseBooleanSetting,
  restaurantDisplayName,
  storefrontWhatsAppEnabledFromSettings,
} from './tenantFeatures'

describe('parseBooleanSetting', () => {
  it('reads booleans, numbers, and common strings', () => {
    expect(parseBooleanSetting(true)).toBe(true)
    expect(parseBooleanSetting(false)).toBe(false)
    expect(parseBooleanSetting('true')).toBe(true)
    expect(parseBooleanSetting('OFF')).toBe(false)
    expect(parseBooleanSetting(1)).toBe(true)
    expect(parseBooleanSetting('maybe')).toBeUndefined()
  })
})

describe('storefrontWhatsAppEnabledFromSettings', () => {
  it('defaults on for Taste of Andhra and off for other tenants', () => {
    expect(
      storefrontWhatsAppEnabledFromSettings({}, { slug: 'thetasteofandhra' }),
    ).toBe(true)
    expect(
      storefrontWhatsAppEnabledFromSettings(
        {},
        { slug: 'chopsticksspicemalabar' },
      ),
    ).toBe(false)
    expect(
      storefrontWhatsAppEnabledFromSettings({}, { slug: 'new-kitchen' }),
    ).toBe(false)
  })

  it('honours an admin-saved setting over the tenant default', () => {
    expect(
      storefrontWhatsAppEnabledFromSettings(
        { storefront_whatsapp_enabled: false },
        { slug: 'thetasteofandhra' },
      ),
    ).toBe(false)
    expect(
      storefrontWhatsAppEnabledFromSettings(
        { storefront_whatsapp_enabled: true },
        { slug: 'chopsticksspicemalabar' },
      ),
    ).toBe(true)
  })
})

describe('isDefaultAndhraTenant', () => {
  it('does not treat another slug as Andhra even if the default org id is present', () => {
    expect(
      isDefaultAndhraTenant({
        slug: 'chopsticksspicemalabar',
        organizationId: TASTE_OF_ANDHRA_ORG_ID,
      }),
    ).toBe(false)
  })
})

describe('restaurantDisplayName', () => {
  it('never falls back to Taste of Andhra for another restaurant', () => {
    expect(
      restaurantDisplayName({ slug: 'chopsticksspicemalabar' }),
    ).toBe('Chopstick Spice Malabar')
    expect(
      restaurantDisplayName({
        name: 'Spice Malabar',
        slug: 'chopsticksspicemalabar',
      }),
    ).toBe('Spice Malabar')
  })
})
