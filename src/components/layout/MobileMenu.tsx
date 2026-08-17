import { useRef } from 'react'
import { Link } from 'react-router-dom'
import type { NavLink } from '@/data/navigation'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/utils/cn'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  links: NavLink[]
  onLogout: () => void
  whatsAppOrderHref?: string | null
}

export function MobileMenu({
  isOpen,
  onClose,
  links,
  onLogout,
  whatsAppOrderHref = null,
}: MobileMenuProps) {
  const { isAuthenticated, user } = useAuth()
  const navRef = useRef<HTMLElement>(null)

  useFocusTrap(navRef, isOpen)

  if (!isOpen) return null

  const handleLogout = () => {
    onClose()
    onLogout()
  }

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close menu overlay"
        onClick={onClose}
      />
      <nav
        ref={navRef}
        className="absolute right-0 top-[72px] h-[calc(100vh-72px)] w-full max-w-sm bg-surface p-6 shadow-xl"
        aria-label="Mobile navigation"
      >
        <ul className="space-y-1">
          {whatsAppOrderHref ? (
            <li className="mb-2">
              <WhatsAppLink
                href={whatsAppOrderHref}
                variant="button"
                fullWidth
                className="w-full"
              >
                Order on WhatsApp
              </WhatsAppLink>
            </li>
          ) : null}
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                onClick={onClose}
                className={cn(
                  'block rounded-[var(--radius-button)] px-4 py-3 text-base font-medium text-text-primary transition-colors hover:bg-primary/10 hover:text-primary',
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="border-t border-black/5 pt-4">
            {isAuthenticated ? (
              <>
                <Link
                  to={ROUTES.ORDERS}
                  onClick={onClose}
                  className="block rounded-[var(--radius-button)] px-4 py-3 text-base font-medium text-text-primary"
                >
                  My Orders
                </Link>
                <Link
                  to={ROUTES.PROFILE}
                  onClick={onClose}
                  className="block rounded-[var(--radius-button)] px-4 py-3 text-base font-medium text-text-primary"
                >
                  Profile ({user?.full_name})
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-[var(--radius-button)] px-4 py-3 text-left text-base font-medium text-primary"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  onClick={onClose}
                  className="block rounded-[var(--radius-button)] px-4 py-3 text-base font-medium text-primary"
                >
                  Login
                </Link>
                <Link
                  to={ROUTES.REGISTER}
                  onClick={onClose}
                  className="block rounded-[var(--radius-button)] px-4 py-3 text-base font-medium text-text-secondary"
                >
                  Register
                </Link>
              </>
            )}
          </li>
        </ul>
      </nav>
    </div>
  )
}
