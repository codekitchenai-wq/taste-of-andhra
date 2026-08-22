import { Suspense, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { PlatformLogo } from '@/components/platform/PlatformLogo'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { LoadingState } from '@/components/ui/LoadingState'
import { PLATFORM_SITE } from '@/constants/PLATFORM_SITE'
import { ROUTES } from '@/constants/ROUTES'
import { cn } from '@/utils/cn'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/#capabilities', label: 'Product' },
  { to: '/#plans', label: 'Plans' },
  { to: '/starter', label: 'Get website' },
  { to: '/demo', label: 'Demo / Enroll' },
] as const

export function PlatformLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  useEffect(() => {
    document.title = `${PLATFORM_SITE.brand.name} — ${PLATFORM_SITE.brand.tagline}`
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute('content', PLATFORM_SITE.brand.shortDescription)
    }
  }, [])

  return (
    <div className="platform-site flex min-h-svh flex-col bg-[var(--platform-bg)] text-[var(--platform-text)]">
      <header
        className={cn(
          'z-40 w-full',
          isHome
            ? 'absolute inset-x-0 top-0 bg-transparent'
            : 'sticky top-0 border-b border-white/10 bg-[var(--platform-ink)]/95 backdrop-blur',
        )}
      >
        <Container className="flex h-16 items-center justify-between gap-4 md:h-20">
          <PlatformLogo variant="nav" />
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((item) =>
              item.to.includes('#') ? (
                <a
                  key={item.to}
                  href={item.to}
                  className="text-sm text-white/75 transition-colors hover:text-white"
                >
                  {item.label}
                </a>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  className={({ isActive }) =>
                    cn(
                      'text-sm transition-colors hover:text-white',
                      isActive ? 'text-white' : 'text-white/75',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to={ROUTES.MASTER.LOGIN}
              className="hidden text-sm text-white/80 underline-offset-4 hover:text-white hover:underline sm:inline"
            >
              DirectApp Master
            </Link>
            <a
              href={PLATFORM_SITE.liveDemo.url}
              target="_blank"
              rel="noreferrer"
              className="hidden text-sm text-white/80 underline-offset-4 hover:text-white hover:underline md:inline"
            >
              Live demo
            </a>
            <Link to={ROUTES.PLATFORM.STARTER_REQUEST}>
              <Button
                size="sm"
                className="bg-[var(--platform-accent)] text-white hover:bg-[var(--platform-accent-hot)]"
              >
                Get website
              </Button>
            </Link>
          </div>
        </Container>
      </header>

      <main className="flex-1">
        <Suspense fallback={<LoadingState fullPage className="py-12" />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-white/10 bg-[var(--platform-ink)] text-white">
        <Container className="grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <PlatformLogo variant="footer" />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
              {PLATFORM_SITE.footer.blurb}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Explore
            </p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>
                <Link
                  to={ROUTES.PLATFORM.STARTER_REQUEST}
                  className="hover:text-white"
                >
                  Get Website Starter
                </Link>
              </li>
              <li>
                <Link to={ROUTES.PLATFORM.DEMO} className="hover:text-white">
                  Request demo / enroll
                </Link>
              </li>
              <li>
                <a
                  href={PLATFORM_SITE.liveDemo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  {PLATFORM_SITE.liveDemo.label}
                </a>
              </li>
              <li>
                <Link to={ROUTES.MASTER.LOGIN} className="hover:text-white">
                  DirectApp Master
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Contact
            </p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>
                <a href={`tel:${PLATFORM_SITE.contact.phone.replace(/\s/g, '')}`}>
                  {PLATFORM_SITE.contact.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${PLATFORM_SITE.contact.email}`}>
                  {PLATFORM_SITE.contact.email}
                </a>
              </li>
              <li>
                <a
                  href={PLATFORM_SITE.contact.mapsDirectionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="leading-relaxed hover:text-white"
                >
                  {PLATFORM_SITE.contact.address}
                </a>
              </li>
            </ul>
          </div>
        </Container>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/45">
          © {new Date().getFullYear()} {PLATFORM_SITE.brand.legalName}. All
          rights reserved.
        </div>
      </footer>
    </div>
  )
}
