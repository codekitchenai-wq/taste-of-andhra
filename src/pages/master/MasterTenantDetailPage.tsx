import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MasterFeatureToggles } from '@/components/master/MasterFeatureToggles'
import { MenuCsvImport } from '@/components/master/MenuCsvImport'
import { OnboardingPack } from '@/components/master/OnboardingPack'
import { RestaurantSetupImport } from '@/components/master/RestaurantSetupImport'
import { TenantHomepageFields } from '@/components/master/TenantHomepageFields'
import { MasterSubscriptionPanel } from '@/components/master/MasterSubscriptionPanel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ROUTES } from '@/constants/ROUTES'
import {
  getMasterOrganization,
  updateOrganizationDisplayName,
  updateOrganizationHomepage,
  type MasterOrganizationDetail,
} from '@/services/onboardingService'
import {
  getOrgFeatureStates,
} from '@/services/entitlementService'
import type { OrgFeatureState } from '@/types/Organization'
import {
  draftFromHomepage,
  type TenantHomepageDraft,
} from '@/utils/tenantHomepage'
import { cn } from '@/utils/cn'

type Tab = 'details' | 'features' | 'setup'

const TABS: { id: Tab; label: string }[] = [
  { id: 'details', label: 'Details & subscription' },
  { id: 'features', label: 'Feature toggles' },
  { id: 'setup', label: 'Setup & templates' },
]

export default function MasterTenantDetailPage() {
  const { orgId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as Tab | null) ?? 'details'

  const [org, setOrg] = useState<MasterOrganizationDetail | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [homepageDraft, setHomepageDraft] = useState<TenantHomepageDraft>({
    mode: 'platform_subdomain',
    customDomain: '',
    externalUrl: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingHomepage, setSavingHomepage] = useState(false)
  const [savingName, setSavingName] = useState(false)

  // Feature toggle state
  const [features, setFeatures] = useState<OrgFeatureState[]>([])
  const [featuresLoading, setFeaturesLoading] = useState(false)
  const [featuresError, setFeaturesError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const result = await getMasterOrganization(orgId)
      if (cancelled) return
      if (!result.success) {
        setOrg(null)
        setError(result.message)
        setLoading(false)
        return
      }
      setOrg(result.data)
      setDisplayName(result.data.name)
      setHomepageDraft(draftFromHomepage(result.data.homepage))
      setError(null)
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [orgId])

  const loadFeatures = useCallback(async () => {
    setFeaturesLoading(true)
    const result = await getOrgFeatureStates(orgId)
    setFeaturesLoading(false)
    if (!result.success) {
      setFeaturesError(result.message)
      setFeatures([])
      return
    }
    setFeaturesError(null)
    setFeatures(result.data)
  }, [orgId])

  useEffect(() => {
    if (activeTab === 'features') {
      void loadFeatures()
    }
  }, [activeTab, loadFeatures])

  async function onSaveDisplayName(event: FormEvent) {
    event.preventDefault()
    if (!org) return
    setSavingName(true)
    const result = await updateOrganizationDisplayName(org.id, displayName)
    setSavingName(false)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    setOrg(result.data)
    setDisplayName(result.data.name)
    toast.success('Restaurant name updated')
  }

  async function onSaveHomepage(event: FormEvent) {
    event.preventDefault()
    if (!org) return
    setSavingHomepage(true)
    const result = await updateOrganizationHomepage(org.id, homepageDraft)
    setSavingHomepage(false)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    setOrg({ ...org, homepage: result.data })
    setHomepageDraft(draftFromHomepage(result.data))
    toast.success('Homepage updated')
  }

  function setTab(tab: Tab) {
    setSearchParams({ tab }, { replace: true })
  }

  if (loading) return <LoadingState variant="inline" />
  if (error || !org) {
    return (
      <ErrorState
        title="Tenant not found"
        message={error ?? 'Unknown restaurant.'}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to={ROUTES.MASTER.TENANTS}
          className="mb-2 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
        >
          ← Restaurants
        </Link>
        <h1 className="font-heading text-3xl font-bold">{org.name}</h1>
        <p className="mt-1 font-mono text-sm text-text-secondary">
          {org.slug} ·{' '}
          <span
            className={cn(
              'font-medium',
              org.status === 'active' ? 'text-success' : 'text-amber-600',
            )}
          >
            {org.status}
          </span>
        </p>
        {org.homepage.homepageUrl && (
          <a
            href={org.homepage.homepageUrl}
            className="mt-1 inline-block break-all font-mono text-xs text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {org.homepage.homepageUrl}
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-black/10">
        <nav className="flex gap-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:border-black/20 hover:text-text-primary',
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Details & subscription */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <form
            className="space-y-4 rounded-[var(--radius-card)] border border-black/10 bg-surface p-5"
            onSubmit={(event) => void onSaveDisplayName(event)}
          >
            <div>
              <h2 className="text-lg font-semibold">Restaurant name</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Shown on this restaurant's admin portal, storefront, and login
                screens.
              </p>
            </div>
            <Input
              label="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
            <Button type="submit" disabled={savingName}>
              {savingName ? 'Saving…' : 'Save restaurant name'}
            </Button>
          </form>

          <MasterSubscriptionPanel
            organizationId={org.id}
            organizationStatus={org.status}
            onOrganizationStatusChange={(status) =>
              setOrg((current) =>
                current
                  ? {
                      ...current,
                      status: status as MasterOrganizationDetail['status'],
                    }
                  : current,
              )
            }
          />

          <form
            className="space-y-4 rounded-[var(--radius-card)] border border-black/10 bg-surface p-5"
            onSubmit={(event) => void onSaveHomepage(event)}
          >
            <TenantHomepageFields
              slug={org.slug}
              draft={homepageDraft}
              onChange={setHomepageDraft}
              radioName="tenant-homepage-mode"
              heading="Public homepage"
            />
            <Button type="submit" disabled={savingHomepage}>
              {savingHomepage ? 'Saving…' : 'Update homepage'}
            </Button>
          </form>
        </div>
      )}

      {/* Tab: Feature toggles */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Feature toggles</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Turn modules on or off for <strong>{org.name}</strong>. Only
              DirectApp Master can change these — restaurant admins cannot.
            </p>
          </div>
          {featuresLoading ? (
            <LoadingState variant="inline" />
          ) : featuresError ? (
            <ErrorState
              title="Could not load features"
              message={featuresError}
              onRetry={() => void loadFeatures()}
            />
          ) : (
            <MasterFeatureToggles
              organizationId={org.id}
              features={features}
              subscriptionActive
              onUpdated={() => void loadFeatures()}
            />
          )}
        </div>
      )}

      {/* Tab: Setup & templates */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Setup & templates</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Upload filled setup and menu sheets, or generate the onboarding
              pack for this restaurant.
            </p>
          </div>

          <RestaurantSetupImport
            organizationId={org.id}
            restaurantSlug={org.slug}
          />
          <MenuCsvImport organizationId={org.id} />

          <OnboardingPack
            restaurantName={org.name}
            ownerEmail={org.email}
            existingUser
            homepageUrl={org.homepage.homepageUrl}
            setupValues={{
              restaurantName: org.name,
              publicEmail: org.email,
            }}
          />
        </div>
      )}
    </div>
  )
}
