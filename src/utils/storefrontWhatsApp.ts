import { whatsappShareUrl } from '@/services/paymentShareService'
import type { CartWithItems } from '@/types/Cart'
import { formatPrice } from '@/utils/format'
import { normalizeIndianPhone } from '@/utils/phone'
import type { StorefrontContact } from '@/utils/storefrontCopy'

export function storefrontWhatsAppPhone(
  contact: StorefrontContact,
): string | null {
  return (
    normalizeIndianPhone(contact.phone) ??
    normalizeIndianPhone(contact.phones[0] ?? '')
  )
}

export function storefrontWhatsAppUrl(
  contact: StorefrontContact,
  message: string,
): string {
  const phone = storefrontWhatsAppPhone(contact)
  if (!phone) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`
  }
  return whatsappShareUrl(phone, message)
}

export function generalOrderWhatsAppMessage(
  contact: StorefrontContact,
  menuUrl?: string,
): string {
  const lines = [
    `Hi ${contact.name},`,
    'I would like to place an order.',
  ]
  if (menuUrl) {
    lines.push('')
    lines.push(`Menu: ${menuUrl}`)
  }
  lines.push('')
  lines.push('Please confirm availability and delivery time.')
  return lines.join('\n')
}

export function generalOrderWhatsAppUrl(
  contact: StorefrontContact,
  menuUrl?: string,
): string {
  const url =
    menuUrl ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}/menu`
      : undefined)
  return storefrontWhatsAppUrl(
    contact,
    generalOrderWhatsAppMessage(contact, url),
  )
}

export function cartWhatsAppMessage(
  contact: StorefrontContact,
  cart: CartWithItems,
): string {
  const lines = [
    `Hi ${contact.name},`,
    'Please confirm this order:',
    '',
  ]

  for (const item of cart.items) {
    const name = item.dish?.name ?? 'Item'
    lines.push(
      `• ${item.quantity}× ${name} — ${formatPrice(item.unit_price * item.quantity)}`,
    )
  }

  lines.push('')
  lines.push(`Subtotal: ${formatPrice(cart.subtotal)}`)
  lines.push('')
  lines.push('Delivery address: ')
  lines.push('Preferred delivery time: ')
  return lines.join('\n')
}

export function cartWhatsAppUrl(
  contact: StorefrontContact,
  cart: CartWithItems,
): string {
  return storefrontWhatsAppUrl(contact, cartWhatsAppMessage(contact, cart))
}

export function contactWhatsAppMessage(
  restaurantName: string,
  values: { name: string; subject?: string; message: string },
): string {
  const lines = [`Hi ${restaurantName},`]
  if (values.subject?.trim()) {
    lines.push(`Subject: ${values.subject.trim()}`)
  }
  if (values.name.trim()) {
    lines.push(`From: ${values.name.trim()}`)
  }
  lines.push('')
  lines.push(values.message.trim())
  return lines.join('\n')
}

export function partyOrderWhatsAppMessage(
  contact: StorefrontContact,
  guestCount?: number,
): string {
  const lines = [
    `Hi ${contact.name},`,
    'I would like to enquire about a party order.',
  ]
  if (guestCount && guestCount > 0) {
    lines.push(`Guests: about ${guestCount}`)
  }
  lines.push('')
  lines.push('Event date: ')
  lines.push('Venue / delivery address: ')
  lines.push('Meal preference (veg / non-veg / mix): ')
  return lines.join('\n')
}
