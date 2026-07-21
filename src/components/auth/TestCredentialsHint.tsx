import { DEMO_ACCOUNTS } from '@/constants/DEMO_ACCOUNTS'
import type { UserRole } from '@/types/enums'

interface TestCredentialsHintProps {
  role: UserRole
  onUseCredentials?: (email: string, password: string) => void
}

const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'Customer',
  admin: 'Admin',
  delivery: 'Delivery partner',
}

export function TestCredentialsHint({
  role,
  onUseCredentials,
}: TestCredentialsHintProps) {
  const account = DEMO_ACCOUNTS[role]

  return (
    <div className="mt-6 rounded-[var(--radius-card)] border border-dashed border-black/15 bg-background px-4 py-3 text-sm">
      <p className="font-medium text-text-primary">
        Test {ROLE_LABELS[role]} account
      </p>
      <dl className="mt-2 space-y-1 text-text-secondary">
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium text-text-primary">Email:</dt>
          <dd className="break-all font-mono text-xs sm:text-sm">
            {account.email}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium text-text-primary">Password:</dt>
          <dd className="font-mono text-xs sm:text-sm">{account.password}</dd>
        </div>
      </dl>
      {onUseCredentials ? (
        <button
          type="button"
          onClick={() => onUseCredentials(account.email, account.password)}
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          Fill form with these credentials
        </button>
      ) : null}
    </div>
  )
}
