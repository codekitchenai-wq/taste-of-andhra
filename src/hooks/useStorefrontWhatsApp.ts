import { useOrganization } from '@/contexts/OrganizationContext'
import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import type { CartWithItems } from '@/types/Cart'
import {
  isSpiceMalabarStorefront,
  storefrontContact,
} from '@/utils/storefrontCopy'
import {
  cartWhatsAppUrl,
  generalOrderWhatsAppUrl,
  storefrontWhatsAppPhone,
  storefrontWhatsAppUrl,
} from '@/utils/storefrontWhatsApp'
import { buildWhatsAppDeepLink } from '@/utils/websiteStarter'

/** Customer-facing WhatsApp CTAs for the current tenant only. */
export function useStorefrontWhatsApp() {
  const org = useOrganization()
  const contact = storefrontContact(org)
  const isChopsticks = isSpiceMalabarStorefront(org)

  // Chopsticks Onam enquiry: fixed number + bilingual pre-fill (footer icon).
  const onamEnquiryUrl = isChopsticks
    ? buildWhatsAppDeepLink(
        ONAM_SADHYA.enquiryWhatsAppPhone,
        ONAM_SADHYA.enquiryWhatsAppMessage,
      )
    : null

  const enabled =
    Boolean(onamEnquiryUrl) ||
    (org.storefrontWhatsAppEnabled && Boolean(storefrontWhatsAppPhone(contact)))

  const orderUrl = onamEnquiryUrl
    ? onamEnquiryUrl
    : enabled
      ? generalOrderWhatsAppUrl(contact)
      : null

  return {
    enabled,
    contact,
    orderUrl,
    cartUrl: (cart: CartWithItems | null | undefined) => {
      if (onamEnquiryUrl) return onamEnquiryUrl
      return enabled && cart ? cartWhatsAppUrl(contact, cart) : null
    },
    messageUrl: (message: string) => {
      if (onamEnquiryUrl) return onamEnquiryUrl
      return enabled ? storefrontWhatsAppUrl(contact, message) : null
    },
  }
}
