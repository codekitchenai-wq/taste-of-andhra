import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MasterWhatsAppObservability } from '@/components/master/MasterWhatsAppObservability'
import { listMasterOrganizations } from '@/services/entitlementService'
import type { MasterOrganizationSummary } from '@/types/Organization'
import { ROUTES } from '@/constants/ROUTES'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { cn } from '@/utils/cn'

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-success/10 text-success',
  trialing: 'bg-amber-100 text-amber-800',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-black/10 text-text-secondary',
}

export default function MasterTenantsPage() {
  const [orgs, setOrgs] = useState<MasterOrganizationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const result = await listMasterOrganizations()
    setLoading(false)
    if (!result.success) {
      setError(result.message)
      return
    }
    setError(null)
    setOrgs(result.data)
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading) return <LoadingState variant="inline" />

  if (error) {
    return (
      <ErrorState
        title="Could not load restaurants"
        message={error}
        onRetry={() => void load()}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Restaurants</h1>
          <p className="mt-1 text-sm text-text-secondary">
            All restaurants on this DirectApp platform. Click a restaurant to
            manage details, subscription, and feature toggles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={ROUTES.MASTER.STARTER_INTAKE}
            className="inline-flex h-10 items-center rounded-[var(--radius-button)] border border-primary px-5 text-sm font-medium text-primary hover:bg-primary/5"
          >
            Starter intake
          </Link>
          <Link
            to={ROUTES.MASTER.ONBOARD}
            className="inline-flex h-10 items-center rounded-[var(--radius-button)] bg-primary px-5 text-sm font-medium text-white hover:bg-primary-dark"
          >
            + Onboard new
          </Link>
        </div>
      </div>

      {orgs.length === 0 ? (
        <p className="text-sm text-text-secondary">
          No restaurants yet.{' '}
          <Link to={ROUTES.MASTER.ONBOARD} className="text-primary hover:underline">
            Onboard the first one.
          </Link>
        </p>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-black/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-black/5 text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Homepage</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr
                  key={org.id}
                  className="border-t border-black/5 hover:bg-black/[0.02]"
                >
                  <td className="px-4 py-3 font-medium">{org.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                    {org.slug}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-medium',
                        STATUS_COLOR[org.status] ?? 'bg-black/10 text-text-secondary',
                      )}
                    >
                      {org.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {org.subscription_active ? (
                      <span className="font-medium text-success">Active</span>
                    ) : (
                      <span className="text-amber-600">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    {org.homepage.homepageUrl ? (
                      <a
                        href={org.homepage.homepageUrl}
                        className="block truncate font-mono text-xs text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                        title={org.homepage.homepageUrl}
                      >
                        {org.homepage.homepageUrl}
                      </a>
                    ) : (
                      <span className="text-xs text-text-secondary">Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3 text-xs">
                      <Link
                        to={ROUTES.MASTER.tenant(org.id)}
                        className="font-medium text-primary hover:underline"
                      >
                        Manage
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MasterWhatsAppObservability />
    </div>
  )
}
