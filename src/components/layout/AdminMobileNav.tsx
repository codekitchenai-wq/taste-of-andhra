import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { ROUTES } from '@/constants/ROUTES'
import { useOrganization } from '@/contexts/OrganizationContext'
import { storefrontContact } from '@/utils/storefrontCopy'
import {
  adminPrimaryNavItems,
  adminSecondaryNavItems,
  isAdminSecondaryRoute,
} from '@/data/adminNavigation'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/utils/cn'

interface AdminMobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export function AdminMobileNav({ isOpen, onClose }: AdminMobileNavProps) {
  const asideRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const contact = storefrontContact(useOrganization())
  const secondaryActive = isAdminSecondaryRoute(pathname)
  const [moreOpen, setMoreOpen] = useState(secondaryActive)

  useFocusTrap(asideRef, isOpen)

  useEffect(() => {
    if (secondaryActive) setMoreOpen(true)
  }, [secondaryActive])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close navigation menu"
        onClick={onClose}
      />
      <aside
        ref={asideRef}
        className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-surface shadow-xl"
        aria-label="Admin navigation"
      >
        <div className="flex h-[72px] items-center justify-between border-b border-black/5 px-4">
          <span className="font-heading text-lg font-bold text-primary">
            {contact.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-secondary hover:bg-black/5"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {adminPrimaryNavItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === ROUTES.ADMIN.DASHBOARD}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-[var(--radius-button)] px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-primary/10 hover:text-primary',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className={cn(
                'flex w-full items-center gap-3 rounded-[var(--radius-button)] px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary',
                secondaryActive && !moreOpen && 'text-primary',
              )}
              aria-expanded={moreOpen}
              aria-controls="admin-mobile-nav-more"
            >
              <ChevronDown
                className={cn(
                  'h-5 w-5 shrink-0 transition-transform',
                  moreOpen && 'rotate-180',
                )}
                aria-hidden="true"
              />
              More
            </button>

            {moreOpen && (
              <div id="admin-mobile-nav-more" className="mt-1 space-y-1">
                {adminSecondaryNavItems.map(({ label, to, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-[var(--radius-button)] px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-text-secondary hover:bg-primary/10 hover:text-primary',
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>
      </aside>
    </div>
  )
}
