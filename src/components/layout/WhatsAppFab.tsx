import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppLink'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useStorefrontWhatsApp } from '@/hooks/useStorefrontWhatsApp'
import { cn } from '@/utils/cn'

/** Mobile-friendly floating WhatsApp order button. Hidden unless admin enabled it. */
export function WhatsAppFab() {
  const { pathname } = useLocation()
  const { isAuthenticated } = useAuth()
  const { cart } = useCart()
  const whatsApp = useStorefrontWhatsApp()

  const href = useMemo(() => {
    if (!whatsApp.enabled) return null
    if (isAuthenticated && cart && cart.items.length > 0) {
      return whatsApp.cartUrl(cart)
    }
    return whatsApp.orderUrl
  }, [cart, isAuthenticated, whatsApp])

  if (!href) return null
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
