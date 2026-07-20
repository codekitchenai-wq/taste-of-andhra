import { Link } from 'react-router-dom'
import type { NavLink } from '@/data/navigation'
import { ROUTES } from '@/constants/ROUTES'
import { cn } from '@/utils/cn'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  links: NavLink[]
}

export function MobileMenu({ isOpen, onClose, links }: MobileMenuProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close menu overlay"
        onClick={onClose}
      />
      <nav
        className="absolute right-0 top-[72px] h-[calc(100vh-72px)] w-full max-w-sm bg-surface p-6 shadow-xl"
        aria-label="Mobile navigation"
      >
        <ul className="space-y-1">
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
            <Link
              to={ROUTES.LOGIN}
              onClick={onClose}
              className="block rounded-[var(--radius-button)] px-4 py-3 text-base font-medium text-primary"
            >
              Login / Register
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}
