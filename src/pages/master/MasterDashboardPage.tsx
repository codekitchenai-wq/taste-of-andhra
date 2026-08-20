import { Link } from 'react-router-dom'
import {
  ALL_TEST_ACCOUNTS,
  DEMO_PASSWORD,
  MASTER_ACCOUNT,
} from '@/constants/DEMO_ACCOUNTS'
import { ROUTES } from '@/constants/ROUTES'
import { USER_ROLE } from '@/constants/USER_ROLE'

export default function MasterDashboardPage() {
  const byRole = {
    platform_master: ALL_TEST_ACCOUNTS.filter((a) => a.role === 'platform_master')
      .length,
    admin: ALL_TEST_ACCOUNTS.filter((a) => a.role === 'admin').length,
    delivery: ALL_TEST_ACCOUNTS.filter((a) => a.role === 'delivery').length,
    customer: ALL_TEST_ACCOUNTS.filter((a) => a.role === 'customer').length,
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-text-primary">
          DirectApp Master dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          You are signed in as DirectApp Master. Only you can turn modules on
          or off for each restaurant — restaurant admins cannot. Demo logins
          below are per tenant and cannot sign in on another restaurant.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ['DirectApp Master', byRole.platform_master],
            ['Restaurant admins', byRole.admin],
            ['Delivery', byRole.delivery],
            ['Customers', byRole.customer],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-[var(--radius-card)] border border-black/10 bg-surface p-4"
          >
            <p className="text-xs text-text-secondary">{label}</p>
            <p className="mt-1 font-heading text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-5">
        <h2 className="text-lg font-semibold">Starter intake</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Free website + menu for new restaurants (FSSAI lock, invite link,
          photos, AI/CSV menu). Does not change Taste of Andhra or Chopsticks.
        </p>
        <Link
          to={ROUTES.MASTER.STARTER_INTAKE}
          className="mt-4 inline-flex h-10 items-center rounded-[var(--radius-button)] bg-primary px-5 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Open Starter intake
        </Link>
      </section>

      <section className="rounded-[var(--radius-card)] border border-black/10 bg-surface p-5">
        <h2 className="text-lg font-semibold">Control plane</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Master login lives only at www.directapp.in/master/login
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            to={ROUTES.MASTER.STARTER_INTAKE}
            className="font-medium text-primary hover:underline"
          >
            Starter intake
          </Link>
          <Link to={ROUTES.MASTER.FEATURES} className="text-primary hover:underline">
            Feature catalog
          </Link>
          <Link to={ROUTES.MASTER.TENANTS} className="text-primary hover:underline">
            Tenant & logins
          </Link>
          <Link to={ROUTES.MASTER.ONBOARD} className="text-primary hover:underline">
            Onboard new
          </Link>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-dashed border-amber-500/40 bg-amber-50/80 p-5">
        <h2 className="text-lg font-semibold">Your DirectApp Master credentials</h2>
        <p className="mt-2 font-mono text-sm">
          {MASTER_ACCOUNT.email} / {DEMO_PASSWORD}
        </p>
        <p className="mt-2 text-xs text-text-secondary">
          Platform level only. Does not replace restaurant admin logins.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Per-tenant demo accounts</h2>
        <div className="mt-3 overflow-x-auto rounded-[var(--radius-card)] border border-black/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-black/5 text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Persona</th>
                <th className="px-3 py-2">Email / username</th>
                <th className="px-3 py-2">Password</th>
                <th className="px-3 py-2">Tenant</th>
              </tr>
            </thead>
            <tbody>
              {ALL_TEST_ACCOUNTS.map((account) => (
                <tr key={account.email} className="border-t border-black/5">
                  <td className="px-3 py-2">
                    {account.role === 'platform_master' ? 'Master' : 'Tenant'}
                  </td>
                  <td className="px-3 py-2">{USER_ROLE[account.role]}</td>
                  <td className="px-3 py-2 font-mono text-xs">{account.email}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {account.password}
                  </td>
                  <td className="px-3 py-2 text-xs text-text-secondary">
                    {account.tenant ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
