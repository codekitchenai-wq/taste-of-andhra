import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, ShoppingCart, User, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { APP_NAME } from '@/constants/APP'
import { ROUTES } from '@/constants/ROUTES'
import { mainNavLinks } from '@/data/navigation'
import { Container } from '@/components/ui/Container'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/cn'

interface NavbarProps {
  transparent?: boolean
}

export function Navbar({ transparent = false }: NavbarProps) {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isSolid = !transparent || isScrolled

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
      <header
        className={cn(
          'sticky top-0 z-50 h-[72px] transition-colors duration-200',
          isSolid
            ? 'border-b border-black/5 bg-surface/95 shadow-sm backdrop-blur-md'
            : 'bg-transparent',
        )}
      >
        <Container className="flex h-full items-center justify-between gap-4">
          <Link
            to={ROUTES.HOME}
            className={cn(
              'font-heading text-xl font-bold transition-colors md:text-2xl',
              isSolid ? 'text-primary' : 'text-white',
            )}
          >
            {APP_NAME}
          </Link>

          <nav
            className="hidden items-center gap-8 lg:flex"
            aria-label="Main navigation"
          >
            {mainNavLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'text-sm font-medium transition-colors',
                    isSolid
                      ? isActive
                        ? 'text-primary'
                        : 'text-text-primary hover:text-primary'
                      : isActive
                        ? 'text-white'
                        : 'text-white/80 hover:text-white',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <Link
              to={ROUTES.CART}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                isSolid
                  ? 'text-text-primary hover:bg-primary/10 hover:text-primary'
                  : 'text-white hover:bg-white/10',
              )}
              aria-label="View cart"
            >
              <ShoppingCart className="h-5 w-5" />
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to={ROUTES.PROFILE}
                  className={cn(
                    'hidden h-10 max-w-[140px] items-center gap-2 rounded-full px-3 transition-colors sm:flex',
                    isSolid
                      ? 'text-text-primary hover:bg-primary/10 hover:text-primary'
                      : 'text-white hover:bg-white/10',
                  )}
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
                  className={cn(
                    'hidden h-10 w-10 items-center justify-center rounded-full transition-colors sm:flex',
                    isSolid
                      ? 'text-text-primary hover:bg-primary/10 hover:text-primary'
                      : 'text-white hover:bg-white/10',
                  )}
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <Link
                to={ROUTES.LOGIN}
                className={cn(
                  'hidden h-10 w-10 items-center justify-center rounded-full transition-colors sm:flex',
                  isSolid
                    ? 'text-text-primary hover:bg-primary/10 hover:text-primary'
                    : 'text-white hover:bg-white/10',
                )}
                aria-label="Sign in"
              >
                <User className="h-5 w-5" />
              </Link>
            )}

            <button
              type="button"
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-colors lg:hidden',
                isSolid
                  ? 'text-text-primary hover:bg-primary/10'
                  : 'text-white hover:bg-white/10',
              )}
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
        links={mainNavLinks}
        onLogout={handleLogout}
      />
    </>
  )
}
