import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { Select } from '@/components/ui/Select'
import { ROUTES } from '@/constants/ROUTES'
import { listMasterOrganizations } from '@/services/entitlementService'
import type { MasterOrganizationSummary } from '@/types/Organization'

/**
 * Feature catalog page — now a quick-select to jump to a tenant's feature
 * toggles tab. Full feature management is embedded in the tenant detail page.
 */
export default function MasterFeaturesPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const orgFromQuery = searchParams.get('org') ?? ''

  const [orgs, setOrgs] = useState<MasterOrganizationSummary[]>([])
  const [orgsError, setOrgsError] = useState<string | null>(null)
  const [loadingOrgs, setLoadingOrgs] = useState(true)

  async function loadOrgs() {
    setLoadingOrgs(true)
    const result = await listMasterOrganizations()
    setLoadingOrgs(false)
    if (!result.success) {
      setOrgsError(result.message)
      setOrgs([])
      return
    }
    setOrgsError(null)
    setOrgs(result.data)
  }

  useEffect(() => {
    void loadOrgs()
  }, [])

  // If org is in query string, redirect straight to that tenant's features tab
  useEffect(() => {
    if (orgFromQuery && orgs.length > 0) {
      const match = orgs.find((o) => o.id === orgFromQuery)
      if (match) {
        void navigate(
          `${ROUTES.MASTER.tenant(orgFromQuery)}?tab=features`,
          { replace: true },
        )
      }
    }
  }, [orgFromQuery, orgs, navigate])

  if (loadingOrgs) return <LoadingState variant="inline" />

  if (orgsError) {
    return (
      <ErrorState
        title="Feature controls unavailable"
        message={orgsError}
        onRetry={() => void loadOrgs()}
      />
    )
  }

  if (orgs.length === 0) {
    return (
      <ErrorState
        title="No restaurants yet"
        message="Create a tenant first, then return here to turn modules on or off."
      />
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Feature catalog</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Select a restaurant to manage its feature toggles. Only DirectApp
          Master can turn modules on or off — restaurant admins cannot.
        </p>
      </div>

      <section className="max-w-md space-y-4 rounded-[var(--radius-card)] border border-black/10 bg-surface p-5">
        <Select
          label="Jump to restaurant features"
          value=""
          onChange={(event) => {
            if (event.target.value) {
              void navigate(
                `${ROUTES.MASTER.tenant(event.target.value)}?tab=features`,
              )
            }
          }}
          options={[
            { value: '', label: 'Select a restaurant…' },
            ...orgs.map((org) => ({
              value: org.id,
              label: `${org.name} (${org.slug})`,
            })),
          ]}
        />
        <p className="text-xs text-text-secondary">
          Feature toggles are now managed inside each restaurant's detail page.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        {orgs.map((org) => (
          <Link
            key={org.id}
            to={`${ROUTES.MASTER.tenant(org.id)}?tab=features`}
            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-black/10 bg-surface px-4 py-2 text-sm hover:border-primary/40 hover:text-primary"
          >
            {org.name}
            <span
              className={
                org.subscription_active
                  ? 'text-xs text-success'
                  : 'text-xs text-amber-600'
              }
            >
              {org.subscription_active ? 'active' : 'inactive'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
