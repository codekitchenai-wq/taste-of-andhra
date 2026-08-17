import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppLink'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useOrganization } from '@/contexts/OrganizationContext'
import { storefrontContact } from '@/utils/storefrontCopy'
import {
  cartWhatsAppUrl,
  generalOrderWhatsAppUrl,
  storefrontWhatsAppPhone,
} from '@/utils/storefrontWhatsApp'
import { cn } from '@/utils/cn'

/** Mobile-friendly floating WhatsApp order button. */
export function WhatsAppFab() {
  const { pathname } = useLocation()
  const org = useOrganization()
  const contact = storefrontContact(org)
  const { isAuthenticated } = useAuth()
  const { cart } = useCart()

  const href = useMemo(() => {
    if (isAuthenticated && cart && cart.items.length > 0) {
      return cartWhatsAppUrl(contact, cart)
    }
    return generalOrderWhatsAppUrl(contact)
  }, [cart, contact, isAuthenticated])

  if (!storefrontWhatsAppPhone(contact)) return null
  if (pathname === ROUTES.ONAM) return null

  const aboveCheckoutBar =
    pathname === ROUTES.CART || pathname === ROUTES.CHECKOUT

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Order on WhatsApp"
      title="Order on WhatsApp"
      className={cn(
        'fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 active:scale-95',
        aboveCheckoutBar ? 'bottom-28' : 'bottom-6',
      )}
    >
      <WhatsAppGlyph className="h-7 w-7" />
    </a>
  )
}
