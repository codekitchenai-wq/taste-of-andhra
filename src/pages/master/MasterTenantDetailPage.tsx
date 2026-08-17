import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MenuCsvImport } from '@/components/master/MenuCsvImport'
import { OnboardingPack } from '@/components/master/OnboardingPack'
import { RestaurantSetupImport } from '@/components/master/RestaurantSetupImport'
import { TenantHomepageFields } from '@/components/master/TenantHomepageFields'
import { MasterSubscriptionPanel } from '@/components/master/MasterSubscriptionPanel'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ROUTES } from '@/constants/ROUTES'
import {
  getMasterOrganization,
  updateOrganizationHomepage,
  type MasterOrganizationDetail,
} from '@/services/onboardingService'
import {
  draftFromHomepage,
  type TenantHomepageDraft,
} from '@/utils/tenantHomepage'

export default function MasterTenantDetailPage() {
  const { orgId = '' } = useParams()
  const [org, setOrg] = useState<MasterOrganizationDetail | null>(null)
  const [homepageDraft, setHomepageDraft] = useState<TenantHomepageDraft>({
    mode: 'platform_subdomain',
    customDomain: '',
    externalUrl: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingHomepage, setSavingHomepage] = useState(false)

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
      setHomepageDraft(draftFromHomepage(result.data.homepage))
      setError(null)
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [orgId])

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
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Additional details</h1>
        <p className="mt-1 text-lg font-medium">{org.name}</p>
        <p className="mt-1 font-mono text-sm text-text-secondary">
          {org.slug} · {org.status}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Manage subscription, setup sheet, menu sheet, and public homepage.
        </p>
        {org.homepage.homepageUrl ? (
          <p className="mt-2 text-sm">
            Customer home:{' '}
            <a
              href={org.homepage.homepageUrl}
              className="break-all font-mono text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {org.homepage.homepageUrl}
            </a>
          </p>
        ) : (
          <p className="mt-2 text-sm text-text-secondary">
            No public homepage yet. Add one below, or change it anytime.
          </p>
        )}
      </div>

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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Templates</h2>
        <p className="text-sm text-text-secondary">
          Upload the filled setup and menu sheets if they were not added when
          the restaurant was created.
        </p>
      </section>
      <RestaurantSetupImport
        organizationId={org.id}
        restaurantSlug={org.slug}
      />
      <MenuCsvImport organizationId={org.id} />

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

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          to={ROUTES.MASTER.featuresForOrg(org.id)}
          className="text-primary hover:underline"
        >
          Manage features
        </Link>
        <Link to={ROUTES.MASTER.TENANTS} className="text-primary hover:underline">
          Back to tenants
        </Link>
        <Link to={ROUTES.MASTER.ONBOARD} className="text-primary hover:underline">
          Onboard another restaurant
        </Link>
      </div>
    </div>
  )
}
