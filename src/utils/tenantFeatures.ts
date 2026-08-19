import { APP_NAME } from '@/constants/APP'
import { TASTE_OF_ANDHRA_ORG_ID } from '@/constants/ORGANIZATION'
import { isSpiceMalabarSlug, isTasteOfAndhraSlug } from '@/constants/TENANTS'
import { DEFAULT_ORDER_NUMBER_SEQUENCE } from '@/types/OrderNumberSequence'
import type { OrderNumberSequenceSettings } from '@/types/OrderNumberSequence'

/** Restaurant-admin toggle stored on `organizations.settings`. */
export const STOREFRONT_WHATSAPP_SETTING_KEY = 'storefront_whatsapp_enabled'

/** Restaurant-admin toggle for customer WhatsApp OTP on /login and /register. */
export const WHATSAPP_OTP_LOGIN_SETTING_KEY = 'whatsapp_otp_login_enabled'

/** Click-to-WhatsApp and customer handoffs use this number when set. */
export const RESTAURANT_WHATSAPP_PHONE_SETTING_KEY = 'restaurant_whatsapp_phone'

export function restaurantWhatsAppPhoneFromSettings(
  settings: Record<string, unknown> | null | undefined,
): string | null {
  const raw = settings?.[RESTAURANT_WHATSAPP_PHONE_SETTING_KEY]
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed || null
}

export function parseBooleanSetting(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
    return undefined
  }
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true
  if (['false', '0', 'no', 'off'].includes(normalized)) return false
  return undefined
}

/** True only for the Taste of Andhra tenant — never for another restaurant host. */
export function isDefaultAndhraTenant(input: {
  slug?: string | null
  organizationId?: string | null
}): boolean {
  if (isTasteOfAndhraSlug(input.slug)) return true
  return (
    input.organizationId === TASTE_OF_ANDHRA_ORG_ID && !input.slug?.trim()
  )
}

/**
 * Storefront click-to-WhatsApp is off for every new restaurant unless an admin
 * turns it on. Taste of Andhra stays on until an admin turns it off.
 */
export function storefrontWhatsAppEnabledFromSettings(
  settings: Record<string, unknown> | null | undefined,
  input: { slug?: string | null; organizationId?: string | null },
): boolean {
  const stored = parseBooleanSetting(
    settings?.[STOREFRONT_WHATSAPP_SETTING_KEY],
  )
  if (stored !== undefined) return stored
  return isDefaultAndhraTenant(input)
}

/**
 * WhatsApp OTP login is off for every new restaurant unless an admin turns it
 * on. Taste of Andhra stays on until an admin turns it off.
 */
export function whatsappOtpLoginEnabledFromSettings(
  settings: Record<string, unknown> | null | undefined,
  input: { slug?: string | null; organizationId?: string | null },
): boolean {
  const stored = parseBooleanSetting(
    settings?.[WHATSAPP_OTP_LOGIN_SETTING_KEY],
  )
  if (stored !== undefined) return stored
  return isDefaultAndhraTenant(input)
}

export function restaurantDisplayName(input: {
  name?: string | null
  slug?: string | null
  organizationId?: string | null
}): string {
  const name = input.name?.trim()
  if (name) return name
  if (isDefaultAndhraTenant(input)) return APP_NAME
  if (isSpiceMalabarSlug(input.slug)) return 'Chopstick Spice Malabar'
  return 'Restaurant'
}

/** Tenant-aware fallback used before an admin saves a custom order sequence. */
export function defaultOrderNumberSequence(input: {
  slug?: string | null
}): OrderNumberSequenceSettings {
  if (isSpiceMalabarSlug(input.slug)) {
    return {
      prefix: 'CSM',
      includeDate: true,
    }
  }
  return DEFAULT_ORDER_NUMBER_SEQUENCE
}

/** Absolute origin of the current tenant host — never another restaurant domain. */
export function currentStorefrontOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  return ''
}
