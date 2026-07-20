import { NavLink } from 'react-router-dom'
import { APP_NAME } from '@/constants/APP'
import { ROUTES } from '@/constants/ROUTES'
import { adminNavItems } from '@/data/adminNavigation'
import { cn } from '@/utils/cn'

interface AdminSidebarProps {
  collapsed?: boolean
}

export function AdminSidebar({ collapsed = false }: AdminSidebarProps) {
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
          {APP_NAME}
        </span>
        {collapsed && (
          <span className="font-heading text-lg font-bold text-primary">TA</span>
        )}
      </div>
      <nav className="flex-1 space-y-1 p-4" aria-label="Admin navigation">
        {adminNavItems.map(({ label, to, icon: Icon }) => (
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
      </nav>
    </aside>
  )
}
