import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { accountNavItems, getAccountPageMeta } from '@/data/accountNavigation'
import { Container } from '@/components/ui/Container'
import { ROUTES } from '@/constants/ROUTES'
import { cn } from '@/utils/cn'

export function AccountLayout() {
  const { pathname } = useLocation()
  const meta = getAccountPageMeta(pathname)

  return (
    <Container as="div" className="py-4 md:py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <nav
          aria-label="Account"
          className="md:w-48 md:shrink-0 lg:w-52"
        >
          <p className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-text-secondary md:block">
            Account
          </p>
          <ul className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            {accountNavItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to} className="shrink-0">
                  <NavLink
                    to={item.to}
                    end={item.to === ROUTES.ORDERS}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-primary hover:bg-black/[0.04]',
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 md:max-w-3xl">
          <header className="mb-3">
            <h1 className="text-xl font-semibold text-text-primary md:text-2xl">
              {meta.label}
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              {meta.description}
            </p>
          </header>
          <Outlet />
        </div>
      </div>
    </Container>
  )
}
