import { Link } from 'react-router-dom'
import {
  DEMO_PASSWORD,
  tenantPersonaAccounts,
} from '@/constants/DEMO_ACCOUNTS'
import { footerTestPersonaLinks } from '@/data/navigation'
import { USER_ROLE } from '@/constants/USER_ROLE'
import { useOrganization } from '@/contexts/OrganizationContext'
import { showStorefrontQaHelpers } from '@/utils/storefrontCopy'

/**
 * TEMPORARY QA panel. Shows only this restaurant’s demo logins.
 * DirectApp Master is not listed here — use www.directapp.in/master/login.
 */
export function FooterTestHelpers() {
  const org = useOrganization()
  if (!showStorefrontQaHelpers(org)) return null

  const tenantAccounts = tenantPersonaAccounts({
    slug: org.slug || 'thetasteofandhra',
    name: org.name,
  })

  return (
    <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-amber-500/40 bg-amber-50/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            QA test helpers
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Logins below work only for {org.name || 'this restaurant'}. Password:{' '}
            <span className="font-mono font-medium text-text-primary">
              {DEMO_PASSWORD}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">
            Persona quick links
          </h4>
          <ul className="mt-2 space-y-1.5">
            {footerTestPersonaLinks
              .filter((link) => !link.to.startsWith('/master'))
              .map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-primary transition-colors hover:text-primary-dark"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-text-primary">
            This restaurant
          </h4>
          <ul className="mt-2 space-y-2">
            {tenantAccounts.map((account) => (
              <li
                key={account.email}
                className="rounded-[var(--radius-button)] border border-black/5 bg-surface px-3 py-2 text-sm"
              >
                <p className="font-medium text-text-primary">
                  {USER_ROLE[account.role]}
                </p>
                <p className="mt-0.5 break-all font-mono text-xs text-text-secondary">
                  {account.email}
                </p>
                <p className="font-mono text-xs text-text-secondary">
                  Password: {account.password}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
