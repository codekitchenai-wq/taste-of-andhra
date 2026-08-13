import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MasterWhatsAppObservability } from '@/components/master/MasterWhatsAppObservability'
import {
  ALL_TEST_ACCOUNTS,
  DEMO_PASSWORD,
  TENANT_TASTE_OF_ANDHRA,
} from '@/constants/DEMO_ACCOUNTS'
import { ROUTES } from '@/constants/ROUTES'
import { USER_ROLE } from '@/constants/USER_ROLE'
import { listMasterOrganizations } from '@/services/entitlementService'
import type { MasterOrganizationSummary } from '@/types/Organization'

const PORTAL_BY_ROLE = {
  platform_master: ROUTES.MASTER.LOGIN,
  admin: ROUTES.ADMIN.LOGIN,
  delivery: ROUTES.DELIVERY.LOGIN,
  customer: ROUTES.LOGIN,
} as const

export default function MasterTenantsPage() {
  const [orgs, setOrgs] = useState<MasterOrganizationSummary[]>([])

  useEffect(() => {
    void listMasterOrganizations().then((result) => {
      if (result.success) setOrgs(result.data)
    })
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Tenants & logins</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Tenant #1 is Taste of Andhra. Shared password for every account:{' '}
          <span className="font-mono font-medium text-text-primary">
            {DEMO_PASSWORD}
          </span>
        </p>
        <Link
          to={ROUTES.MASTER.ONBOARD}
          className="mt-4 inline-flex h-11 items-center rounded-[var(--radius-button)] bg-primary px-6 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Onboard restaurant
        </Link>
      </div>

      {orgs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Restaurants</h2>
          <ul className="mt-3 space-y-3">
            {orgs.map((org) => (
              <li
                key={org.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-black/10 bg-surface px-4 py-3"
              >
                <div>
                  <p className="font-medium">{org.name}</p>
                  <p className="font-mono text-xs text-text-secondary">
                    {org.slug} · {org.status}
                    {org.subscription_active ? '' : ' · subscription inactive'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link
                    to={ROUTES.MASTER.tenant(org.id)}
                    className="text-primary hover:underline"
                  >
                    Open / import menu
                  </Link>
                  <Link
                    to={ROUTES.MASTER.featuresForOrg(org.id)}
                    className="text-primary hover:underline"
                  >
                    Manage features
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-[var(--radius-card)] border border-black/10 bg-surface p-5">
        <h2 className="text-lg font-semibold">{TENANT_TASTE_OF_ANDHRA.name}</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-secondary">Slug</dt>
            <dd className="font-mono">{TENANT_TASTE_OF_ANDHRA.slug}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Organization id</dt>
            <dd className="break-all font-mono text-xs">
              {TENANT_TASTE_OF_ANDHRA.id}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link to={ROUTES.HOME} className="text-primary hover:underline">
            Storefront
          </Link>
          <Link to={ROUTES.MENU} className="text-primary hover:underline">
            Menu
          </Link>
          <Link to={ROUTES.ADMIN.LOGIN} className="text-primary hover:underline">
            Admin login
          </Link>
          <Link
            to={ROUTES.DELIVERY.LOGIN}
            className="text-primary hover:underline"
          >
            Delivery login
          </Link>
          <Link
            to={ROUTES.MASTER.featuresForOrg(TENANT_TASTE_OF_ANDHRA.id)}
            className="text-primary hover:underline"
          >
            Manage features
          </Link>
        </div>
      </section>

      <MasterWhatsAppObservability />

      <section>
        <h2 className="text-lg font-semibold">Persona logins for this tenant</h2>
        <ul className="mt-3 space-y-3">
          {ALL_TEST_ACCOUNTS.filter((a) => a.role !== 'platform_master').map(
            (account) => (
              <li
                key={account.email}
                className="rounded-[var(--radius-card)] border border-black/10 bg-surface px-4 py-3 text-sm"
              >
                <p className="font-medium">
                  {account.group} · {USER_ROLE[account.role]}
                </p>
                <p className="mt-1 font-mono text-xs text-text-secondary">
                  {account.email} / {account.password}
                </p>
                <Link
                  to={PORTAL_BY_ROLE[account.role]}
                  className="mt-2 inline-block text-primary hover:underline"
                >
                  Open {USER_ROLE[account.role]} login
                </Link>
              </li>
            ),
          )}
        </ul>
      </section>
    </div>
  )
}
