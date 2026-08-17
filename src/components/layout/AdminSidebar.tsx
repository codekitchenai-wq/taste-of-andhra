import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { ROUTES } from '@/constants/ROUTES'
import { useOrganization } from '@/contexts/OrganizationContext'
import { storefrontContact } from '@/utils/storefrontCopy'
import {
  adminPrimaryNavItems,
  adminSecondaryNavItems,
  isAdminSecondaryRoute,
} from '@/data/adminNavigation'
import { cn } from '@/utils/cn'

interface AdminSidebarProps {
  collapsed?: boolean
}

export function AdminSidebar({ collapsed = false }: AdminSidebarProps) {
  const { pathname } = useLocation()
  const contact = storefrontContact(useOrganization())
  const displayName = contact.name
  const secondaryActive = isAdminSecondaryRoute(pathname)
  const [moreOpen, setMoreOpen] = useState(secondaryActive)

  useEffect(() => {
    if (secondaryActive) setMoreOpen(true)
  }, [secondaryActive])

  return (
    <aside
      className={cn(
        'hidden h-full shrink-0 border-r border-black/5 bg-surface lg:flex lg:flex-col',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="flex h-[72px] items-center border-b border-black/5 px-6">
        <span
          className={cn(
            'font-heading text-lg font-bold text-primary',
            collapsed && 'sr-only',
          )}
        >
          {displayName}
        </span>
        {collapsed && (
          <span className="font-heading text-lg font-bold text-primary">TA</span>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Admin navigation">
        {adminPrimaryNavItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === ROUTES.ADMIN.DASHBOARD}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-[var(--radius-button)] px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-primary/10 hover:text-primary',
                collapsed && 'justify-center px-2',
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={cn(
              'flex w-full items-center gap-3 rounded-[var(--radius-button)] px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary',
              collapsed && 'justify-center px-2',
              secondaryActive && !moreOpen && 'text-primary',
            )}
            aria-expanded={moreOpen}
            aria-controls="admin-nav-more"
            title={collapsed ? 'More' : undefined}
          >
            <ChevronDown
              className={cn(
                'h-5 w-5 shrink-0 transition-transform',
                moreOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
            {!collapsed && <span>More</span>}
          </button>

          {moreOpen && (
            <div id="admin-nav-more" className="mt-1 space-y-1">
              {adminSecondaryNavItems.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-[var(--radius-button)] px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:bg-primary/10 hover:text-primary',
                      collapsed && 'justify-center px-2',
                    )
                  }
                  title={collapsed ? label : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}
