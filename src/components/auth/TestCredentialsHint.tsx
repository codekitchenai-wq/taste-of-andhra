import {
  accountsForRole,
  primaryAccountForRole,
} from '@/constants/DEMO_ACCOUNTS'
import type { UserRole } from '@/types/enums'
import { useOrganization } from '@/contexts/OrganizationContext'
import { showStorefrontQaHelpers } from '@/utils/storefrontCopy'

interface TestCredentialsHintProps {
  role: UserRole
  onUseCredentials?: (email: string, password: string) => void
}

const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'Customer',
  admin: 'Admin',
  delivery: 'Delivery partner',
  platform_master: 'DirectApp Master',
}

export function TestCredentialsHint({
  role,
  onUseCredentials,
}: TestCredentialsHintProps) {
  const org = useOrganization()
  if (!showStorefrontQaHelpers(org)) return null

  const primary = primaryAccountForRole(role)
  const others = accountsForRole(role).filter((a) => a.email !== primary.email)

  return (
    <div className="mt-6 rounded-[var(--radius-card)] border border-dashed border-black/15 bg-background px-4 py-3 text-sm">
      <p className="font-medium text-text-primary">
        Test {ROLE_LABELS[role]} login
      </p>
      <p className="mt-1 text-xs text-text-secondary">
        Shared password for all test accounts:{' '}
        <span className="font-mono font-medium text-text-primary">
          {primary.password}
        </span>
      </p>
      <dl className="mt-3 space-y-1 text-text-secondary">
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium text-text-primary">Email / username:</dt>
          <dd className="break-all font-mono text-xs sm:text-sm">
            {primary.email}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium text-text-primary">Password:</dt>
          <dd className="font-mono text-xs sm:text-sm">{primary.password}</dd>
        </div>
      </dl>
      {onUseCredentials ? (
        <button
          type="button"
          onClick={() => onUseCredentials(primary.email, primary.password)}
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          Fill form with these credentials
        </button>
      ) : null}

      {others.length > 0 ? (
        <div className="mt-4 border-t border-black/10 pt-3">
          <p className="text-xs font-medium text-text-primary">
            Additional {ROLE_LABELS[role]} accounts
          </p>
          <ul className="mt-2 space-y-2">
            {others.map((account) => (
              <li key={account.email} className="text-xs text-text-secondary">
                <span className="font-medium text-text-primary">
                  {account.group ?? account.fullName}:
                </span>{' '}
                <span className="break-all font-mono">{account.email}</span>
                {onUseCredentials ? (
                  <>
                    {' · '}
                    <button
                      type="button"
                      onClick={() =>
                        onUseCredentials(account.email, account.password)
                      }
                      className="font-medium text-primary hover:underline"
                    >
                      Fill
                    </button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
