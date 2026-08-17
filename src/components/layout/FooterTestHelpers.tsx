import { Link } from 'react-router-dom'
import {
  ALL_TEST_ACCOUNTS,
  DEMO_PASSWORD,
  MASTER_ACCOUNT,
} from '@/constants/DEMO_ACCOUNTS'
import { footerTestPersonaLinks } from '@/data/navigation'
import { USER_ROLE } from '@/constants/USER_ROLE'
import { useOrganization } from '@/contexts/OrganizationContext'
import { showStorefrontQaHelpers } from '@/utils/storefrontCopy'

/**
 * TEMPORARY QA panel for the Taste of Andhra public footer.
 * Hidden on other restaurant storefronts (e.g. Spice Malabar).
 */
export function FooterTestHelpers() {
  const org = useOrganization()
  if (!showStorefrontQaHelpers(org)) return null

  return (
    <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-amber-500/40 bg-amber-50/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">
            QA test helpers
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Temporary — remove after testing (
            <code className="rounded bg-black/5 px-1">SHOW_TEST_HELPERS</code>
            ). Shared password for all personas:{' '}
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
            {footerTestPersonaLinks.map((link) => (
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
            Superuser (platform)
          </h4>
          <div className="mt-2 rounded-[var(--radius-button)] border border-black/5 bg-surface px-3 py-2 text-sm">
            <p className="font-medium text-text-primary">
              {MASTER_ACCOUNT.fullName}
            </p>
            <p className="mt-0.5 break-all font-mono text-xs text-text-secondary">
              {MASTER_ACCOUNT.email}
            </p>
            <p className="font-mono text-xs text-text-secondary">
              Password: {MASTER_ACCOUNT.password}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-text-primary">
          All test login credentials
        </h4>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_TEST_ACCOUNTS.map((account) => (
            <li
              key={account.email}
              className="rounded-[var(--radius-button)] border border-black/5 bg-surface px-3 py-2 text-sm"
            >
              <p className="font-medium text-text-primary">
                {account.group} · {USER_ROLE[account.role]}
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
  )
}
