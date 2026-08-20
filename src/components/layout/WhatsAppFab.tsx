import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppLink'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useStorefrontWhatsApp } from '@/hooks/useStorefrontWhatsApp'
import { useIsLandingPage } from '@/hooks/useIsLandingPage'
import { cn } from '@/utils/cn'
import { bumpStarterAnalytics } from '@/utils/starterAnalytics'
import { isWebsiteStarterTrack } from '@/utils/websiteStarter'

/** Mobile-friendly floating WhatsApp order button. Hidden unless admin enabled it. */
export function WhatsAppFab() {
  const { pathname } = useLocation()
  const isLandingPage = useIsLandingPage()
  const { isAuthenticated } = useAuth()
  const { cart } = useCart()
  const org = useOrganization()
  const whatsApp = useStorefrontWhatsApp()

  const href = useMemo(() => {
    if (!whatsApp.enabled) return null
    if (isAuthenticated && cart && cart.items.length > 0) {
      return whatsApp.cartUrl(cart)
    }
    return whatsApp.orderUrl
  }, [cart, isAuthenticated, whatsApp])

  if (!href) return null
  if (pathname === ROUTES.ONAM || isLandingPage) return null

  const aboveCheckoutBar =
    pathname === ROUTES.CART || pathname === ROUTES.CHECKOUT

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      title="Chat on WhatsApp"
      onClick={() => {
        if (isWebsiteStarterTrack(org.settings)) {
          bumpStarterAnalytics(org.organizationId, 'whatsappClicks')
        }
      }}
      className={cn(
        'fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 active:scale-95',
        aboveCheckoutBar ? 'bottom-28' : 'bottom-6',
      )}
    >
      <WhatsAppGlyph className="h-7 w-7" />
    </a>
  )
}
