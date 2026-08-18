import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MasterWhatsAppObservability } from '@/components/master/MasterWhatsAppObservability'
import {
  DEMO_PASSWORD,
  MASTER_ACCOUNT,
  TENANT_TASTE_OF_ANDHRA,
  tenantPersonaAccounts,
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
          Tenant #1 is Taste of Andhra. DirectApp Master can manage every
          restaurant from this console. Shared password for every account:{' '}
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
                  {org.homepage.homepageUrl ? (
                    <a
                      href={org.homepage.homepageUrl}
                      className="mt-1 block break-all font-mono text-xs text-primary hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {org.homepage.homepageUrl}
                    </a>
                  ) : (
                    <p className="mt-1 text-xs text-text-secondary">
                      Homepage not set — add or change on the tenant page
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link
                    to={ROUTES.MASTER.tenant(org.id)}
                    className="text-primary hover:underline"
                  >
                    Subscription & details
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
        <h2 className="text-lg font-semibold">DirectApp Master</h2>
        <p className="mt-2 font-mono text-sm">
          {MASTER_ACCOUNT.email} / {MASTER_ACCOUNT.password}
        </p>
        <Link
          to={PORTAL_BY_ROLE.platform_master}
          className="mt-2 inline-block text-sm text-primary hover:underline"
        >
          Open Master login
        </Link>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Persona logins per tenant</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Each demo user can sign in only on that restaurant’s host.
        </p>
        <div className="mt-3 space-y-6">
          {(orgs.length > 0
            ? orgs
            : [
                {
                  id: TENANT_TASTE_OF_ANDHRA.id,
                  name: TENANT_TASTE_OF_ANDHRA.name,
                  slug: TENANT_TASTE_OF_ANDHRA.slug,
                },
              ]
          ).map((org) => (
            <div key={org.id}>
              <h3 className="font-medium">{org.name}</h3>
              <ul className="mt-2 space-y-3">
                {tenantPersonaAccounts(org).map((account) => {
                  const loginTo =
                    account.role === 'admin'
                      ? ROUTES.ADMIN.LOGIN
                      : account.role === 'delivery'
                        ? ROUTES.DELIVERY.LOGIN
                        : ROUTES.LOGIN
                  return (
                  <li
                    key={account.email}
                    className="rounded-[var(--radius-card)] border border-black/10 bg-surface px-4 py-3 text-sm"
                  >
                    <p className="font-medium">
                      {USER_ROLE[account.role]}
                    </p>
                    <p className="mt-1 font-mono text-xs text-text-secondary">
                      {account.email} / {account.password}
                    </p>
                    <Link
                      to={loginTo}
                      className="mt-2 inline-block text-primary hover:underline"
                    >
                      Open {USER_ROLE[account.role]} login
                    </Link>
                  </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
