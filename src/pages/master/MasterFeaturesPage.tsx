import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MasterFeatureToggles } from '@/components/master/MasterFeatureToggles'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { Select } from '@/components/ui/Select'
import { ROUTES } from '@/constants/ROUTES'
import {
  getOrgFeatureStates,
  listMasterOrganizations,
} from '@/services/entitlementService'
import type {
  MasterOrganizationSummary,
  OrgFeatureState,
} from '@/types/Organization'

export default function MasterFeaturesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const orgFromQuery = searchParams.get('org') ?? ''

  const [orgs, setOrgs] = useState<MasterOrganizationSummary[]>([])
  const [features, setFeatures] = useState<OrgFeatureState[]>([])
  const [orgsError, setOrgsError] = useState<string | null>(null)
  const [featuresError, setFeaturesError] = useState<string | null>(null)
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [loadingFeatures, setLoadingFeatures] = useState(false)

  const selectedOrg = useMemo(
    () => orgs.find((org) => org.id === orgFromQuery) ?? orgs[0] ?? null,
    [orgs, orgFromQuery],
  )

  const loadOrgs = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    if (orgFromQuery || !orgs[0]) return
    setSearchParams({ org: orgs[0].id }, { replace: true })
  }, [orgFromQuery, orgs, setSearchParams])

  const loadFeatures = useCallback(async (organizationId: string) => {
    setLoadingFeatures(true)
    const result = await getOrgFeatureStates(organizationId)
    setLoadingFeatures(false)
    if (!result.success) {
      setFeaturesError(result.message)
      setFeatures([])
      return
    }
    setFeaturesError(null)
    setFeatures(result.data)
  }, [])

  useEffect(() => {
    void loadOrgs()
  }, [loadOrgs])

  useEffect(() => {
    if (!selectedOrg) return
    void loadFeatures(selectedOrg.id)
  }, [selectedOrg, loadFeatures])

  if (loadingOrgs) {
    return <LoadingState variant="inline" />
  }

  if (orgsError) {
    return (
      <ErrorState
        title="Feature controls unavailable"
        message={orgsError}
        onRetry={() => void loadOrgs()}
      />
    )
  }

  if (!selectedOrg) {
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
          Only you (platform admin) can turn modules on or off for each
          restaurant. Restaurant owners and staff cannot enable or disable
          features. Core modules stay on. Turning an add-on on also enables
          anything it depends on.
        </p>
      </div>

      <section className="space-y-4">
        <div className="max-w-md">
          <Select
            label="Restaurant"
            value={selectedOrg.id}
            onChange={(event) =>
              setSearchParams({ org: event.target.value }, { replace: true })
            }
            options={orgs.map((org) => ({
              value: org.id,
              label: `${org.name} (${org.slug})`,
            }))}
          />
        </div>
        <p className="text-xs text-text-secondary">
          Status: {selectedOrg.status}
          {selectedOrg.subscription_active ? ' · subscription active' : ' · subscription inactive'}
        </p>

        {loadingFeatures ? (
          <LoadingState variant="inline" />
        ) : featuresError ? (
          <ErrorState
            title="Could not load features"
            message={featuresError}
            onRetry={() => void loadFeatures(selectedOrg.id)}
          />
        ) : (
          <MasterFeatureToggles
            organizationId={selectedOrg.id}
            features={features}
            subscriptionActive={selectedOrg.subscription_active}
            onUpdated={() => void loadFeatures(selectedOrg.id)}
          />
        )}
      </section>

      <p className="text-sm text-text-secondary">
        <Link to={ROUTES.MASTER.TENANTS} className="text-primary hover:underline">
          Back to tenants
        </Link>
      </p>
    </div>
  )
}
