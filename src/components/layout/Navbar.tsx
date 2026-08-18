import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Bell,
  ClipboardList,
  Heart,
  LogOut,
  ShoppingCart,
  User,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { ROUTES } from '@/constants/ROUTES'
import { useOrganization } from '@/contexts/OrganizationContext'
import { storefrontContact, isSpiceMalabarStorefront } from '@/utils/storefrontCopy'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import { useStorefrontWhatsApp } from '@/hooks/useStorefrontWhatsApp'
import { mainNavLinks, onamSpecialNavLink } from '@/data/navigation'
import { Container } from '@/components/ui/Container'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { cn } from '@/utils/cn'

export function Navbar() {
  const org = useOrganization()
  const { isAuthenticated, user, logout } = useAuth()
  const contact = storefrontContact(org)
  const navLinks = isSpiceMalabarStorefront(org)
    ? [mainNavLinks[0], onamSpecialNavLink, ...mainNavLinks.slice(1)]
    : mainNavLinks
  const { enabled: showWhatsApp, orderUrl: whatsAppOrderHref } =
    useStorefrontWhatsApp()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleLogout = async () => {
    const result = await logout()

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Signed out successfully')
    navigate(ROUTES.HOME)
  }

  return (
    <>
      <header className="sticky top-0 z-50 h-[72px] border-b border-black/5 bg-surface/95 shadow-sm backdrop-blur-md">
        <Container className="flex h-full items-center justify-between gap-4">
          <Link
            to={ROUTES.HOME}
            className="font-heading text-xl font-bold text-primary transition-colors md:text-2xl"
          >
            {contact.name}
          </Link>

          <nav
            className="hidden items-center gap-5 xl:gap-8 lg:flex"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'text-sm font-medium transition-colors',
                    isActive
                      ? 'text-primary'
                      : 'text-text-primary hover:text-primary',
                  )
                }
              >
                {link.to === ROUTES.ONAM ? (
                  <span className="inline-flex items-center gap-1.5">
                    {link.label}
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-primary">
                      Festive
                    </span>
                  </span>
                ) : (
                  link.label
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            {showWhatsApp && whatsAppOrderHref ? (
              <WhatsAppLink
                href={whatsAppOrderHref}
                variant="icon"
                className="h-10 w-10 lg:hidden"
              >
                Order on WhatsApp
              </WhatsAppLink>
            ) : null}
            {isAuthenticated && (
              <>
                <Link
                  to={ROUTES.ORDERS}
                  className="hidden h-10 w-10 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-primary/10 hover:text-primary sm:flex"
                  aria-label="My Orders"
                  title="My Orders"
                >
                  <ClipboardList className="h-5 w-5" />
                </Link>
                <Link
                  to={ROUTES.FAVORITES}
                  className="hidden h-10 w-10 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-primary/10 hover:text-primary sm:flex"
                  aria-label="Favorites"
                >
                  <Heart className="h-5 w-5" />
                </Link>
                <Link
                  to={ROUTES.NOTIFICATIONS}
                  className="hidden h-10 w-10 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-primary/10 hover:text-primary sm:flex"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                </Link>
              </>
            )}
            <Link
              to={ROUTES.CART}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label={`View cart${itemCount > 0 ? `, ${itemCount} items` : ''}`}
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-white">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to={ROUTES.PROFILE}
                  className="hidden h-10 max-w-[140px] items-center gap-2 rounded-full px-3 text-text-primary transition-colors hover:bg-primary/10 hover:text-primary sm:flex"
                  aria-label="View profile"
                >
                  <User className="h-5 w-5 shrink-0" />
                  <span className="truncate text-sm font-medium">
                    {user?.full_name.split(' ')[0]}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden h-10 w-10 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-primary/10 hover:text-primary sm:flex"
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <Link
                to={ROUTES.LOGIN}
                className="hidden h-10 w-10 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-primary/10 hover:text-primary sm:flex"
                aria-label="Sign in"
              >
                <User className="h-5 w-5" />
              </Link>
            )}

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-primary/10 lg:hidden"
              aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileOpen}
              onClick={() => setIsMobileOpen((open) => !open)}
            >
              {isMobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </Container>
      </header>

      <MobileMenu
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        links={navLinks}
        onLogout={handleLogout}
        whatsAppOrderHref={showWhatsApp ? whatsAppOrderHref : null}
      />
    </>
  )
}
