import { useOrganization } from '@/contexts/OrganizationContext'
import type { CartWithItems } from '@/types/Cart'
import { storefrontContact } from '@/utils/storefrontCopy'
import {
  cartWhatsAppUrl,
  generalOrderWhatsAppUrl,
  storefrontWhatsAppPhone,
  storefrontWhatsAppUrl,
} from '@/utils/storefrontWhatsApp'

/** Customer-facing WhatsApp CTAs for the current tenant only. */
export function useStorefrontWhatsApp() {
  const org = useOrganization()
  const contact = storefrontContact(org)
  const enabled =
    org.storefrontWhatsAppEnabled && Boolean(storefrontWhatsAppPhone(contact))

  return {
    enabled,
    contact,
    orderUrl: enabled ? generalOrderWhatsAppUrl(contact) : null,
    cartUrl: (cart: CartWithItems | null | undefined) =>
      enabled && cart ? cartWhatsAppUrl(contact, cart) : null,
    messageUrl: (message: string) =>
      enabled ? storefrontWhatsAppUrl(contact, message) : null,
  }
}
