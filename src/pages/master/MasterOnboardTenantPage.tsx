import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { OnboardingPack } from '@/components/master/OnboardingPack'
import { OnboardingTemplateDownloads } from '@/components/master/OnboardingTemplateDownloads'
import { OnboardingTemplateUploads } from '@/components/master/OnboardingTemplateUploads'
import { TenantHomepageFields } from '@/components/master/TenantHomepageFields'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  ADDON_FEATURE_OPTIONS,
  DEFAULT_TRIAL_DAYS,
  expandSelectedAddons,
  type BillingCycle,
  type BillingMode,
} from '@/constants/ONBOARDING'
import { ROUTES } from '@/constants/ROUTES'
import {
  importMenuCsv,
  importRestaurantSetupCsv,
  onboardRestaurant,
  type OnboardRestaurantResult,
} from '@/services/onboardingService'
import { generateSlug } from '@/utils/slug'
import type { TenantHomepageDraft } from '@/utils/tenantHomepage'

export default function MasterOnboardTenantPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [publicPhone, setPublicPhone] = useState('')
  const [city, setCity] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [billingMode, setBillingMode] = useState<BillingMode>('trial')
  const [trialDays, setTrialDays] = useState(String(DEFAULT_TRIAL_DAYS))
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [homepage, setHomepage] = useState<TenantHomepageDraft>({
    mode: 'set_later',
    customDomain: '',
    externalUrl: '',
  })
  const [addons, setAddons] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<OnboardRestaurantResult | null>(null)
  const [setupFile, setSetupFile] = useState<File | null>(null)
  const [menuFile, setMenuFile] = useState<File | null>(null)

  const effectiveSlug = slugTouched ? slug : generateSlug(name)
  const selectedWithDeps = useMemo(() => expandSelectedAddons(addons), [addons])

  function toggleAddon(key: string) {
    setAddons((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
        return [...next]
      }
      next.add(key)
      return expandSelectedAddons([...next])
    })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const result = await onboardRestaurant({
      name,
      slug: effectiveSlug,
      publicPhone,
      city,
      ownerName,
      ownerEmail,
      ownerPhone,
      billingMode,
      trialDays: Number(trialDays) || DEFAULT_TRIAL_DAYS,
      billingCycle,
      addonKeys: addons,
      homepage,
    })

    if (!result.success) {
      setBusy(false)
      toast.error(result.message)
      return
    }

    const importNotes: string[] = []
    if (setupFile) {
      const setupResult = await importRestaurantSetupCsv(
        result.data.organizationId,
        await setupFile.text(),
      )
      importNotes.push(
        setupResult.success
          ? `Setup loaded (${setupResult.data.updated.join(', ') || 'saved'}).`
          : `Setup file not loaded: ${setupResult.message}`,
      )
    }
    if (menuFile) {
      const menuResult = await importMenuCsv(
        result.data.organizationId,
        await menuFile.text(),
        false,
      )
      importNotes.push(
        menuResult.success
          ? `Menu loaded (${menuResult.data.dishesCreated} dishes).`
          : `Menu file not loaded: ${menuResult.message}`,
      )
    }

    setBusy(false)
    setCreated(result.data)
    if (result.data.inviteError) {
      toast.error(result.data.inviteError)
    } else {
      toast.success(`${result.data.name} created`)
    }
    for (const note of importNotes) {
      if (note.includes('not loaded')) toast.error(note)
      else toast.success(note)
    }
  }

  if (created) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold">Restaurant created</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {created.name} ({created.slug}) is{' '}
            {created.billingMode === 'paid'
              ? `on a paid ${created.billingCycle} plan`
              : `on a ${created.periodDays}-day trial`}
            . Sheets are optional — add them later if you skipped them.
          </p>
          {created.homepage.homepageUrl ? (
            <p className="mt-2 text-sm">
              Customer home:{' '}
              <a
                href={created.homepage.homepageUrl}
                className="break-all font-mono text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {created.homepage.homepageUrl}
              </a>
            </p>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">
              No public homepage yet. You can add or change it on the tenant
              page.
            </p>
          )}
        </div>
        {created.inviteError && (
          <p className="rounded-[var(--radius-card)] border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {created.inviteError}
          </p>
        )}
        {created.setupWarning && (
          <p className="rounded-[var(--radius-card)] border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Restaurant created, but default setup was not saved:{' '}
            {created.setupWarning}
          </p>
        )}
        <OnboardingPack
          restaurantName={created.name}
          ownerEmail={created.ownerEmail}
          temporaryPassword={created.temporaryPassword}
          existingUser={created.existingUser}
          homepageUrl={created.homepage.homepageUrl}
          setupValues={{
            restaurantName: created.name,
            publicPhone: created.publicPhone,
            publicEmail: created.ownerEmail,
            city: created.city,
          }}
        />
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            to={ROUTES.MASTER.tenant(created.organizationId)}
            className="text-primary hover:underline"
          >
            Add additional details later (templates, homepage)
          </Link>
          <Link
            to={ROUTES.MASTER.featuresForOrg(created.organizationId)}
            className="text-primary hover:underline"
          >
            Adjust features
          </Link>
          <Link to={ROUTES.MASTER.TENANTS} className="text-primary hover:underline">
            Back to tenants
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Onboard restaurant</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Create the restaurant now. Setup and menu sheets are optional — attach
          them at the bottom, or add them later on Additional details.
        </p>
      </div>

      <OnboardingTemplateDownloads
        restaurantName={name}
        setupValues={{
          restaurantName: name,
          publicPhone,
          publicEmail: ownerEmail,
          city,
        }}
      />

      <form className="space-y-8" onSubmit={(event) => void onSubmit(event)}>
        <section className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Restaurant name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            label="URL slug (tenant key)"
            value={effectiveSlug}
            onChange={(event) => {
              setSlugTouched(true)
              setSlug(event.target.value)
            }}
            required
          />
          <Input
            label="City"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            required
          />
          <Input
            label="Public phone"
            value={publicPhone}
            onChange={(event) => setPublicPhone(event.target.value)}
            required
          />
          <Input
            label="Owner full name"
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            required
          />
          <Input
            label="Owner email"
            type="email"
            value={ownerEmail}
            onChange={(event) => setOwnerEmail(event.target.value)}
            required
          />
          <Input
            label="Owner WhatsApp phone"
            value={ownerPhone}
            onChange={(event) => setOwnerPhone(event.target.value)}
            required
          />
          <fieldset className="sm:col-span-2 space-y-3">
            <legend className="text-sm font-medium text-text-primary">
              Billing
            </legend>
            <p className="text-sm text-text-secondary">
              Trial is free until the days run out. Paid skips trial and marks
              the restaurant active from day one.
            </p>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="onboard-billing-mode"
                  checked={billingMode === 'trial'}
                  onChange={() => setBillingMode('trial')}
                />
                Trial
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="onboard-billing-mode"
                  checked={billingMode === 'paid'}
                  onChange={() => setBillingMode('paid')}
                />
                Paid
              </label>
            </div>
            {billingMode === 'trial' ? (
              <Input
                label="Trial days"
                type="number"
                min={1}
                value={trialDays}
                onChange={(event) => setTrialDays(event.target.value)}
              />
            ) : (
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="onboard-billing-cycle"
                    checked={billingCycle === 'monthly'}
                    onChange={() => setBillingCycle('monthly')}
                  />
                  Monthly (30 days)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="onboard-billing-cycle"
                    checked={billingCycle === 'yearly'}
                    onChange={() => setBillingCycle('yearly')}
                  />
                  Yearly (365 days)
                </label>
              </div>
            )}
          </fieldset>
          <TenantHomepageFields
            slug={effectiveSlug}
            draft={homepage}
            onChange={setHomepage}
            radioName="onboard-homepage-mode"
            heading="Public homepage — add now or later"
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Add-on features</h2>
          <p className="text-sm text-text-secondary">
            Core modules (menu, orders, customers, settings) stay on. Required
            add-ons turn on with the one you pick.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ADDON_FEATURE_OPTIONS.map((option) => (
              <li key={option.key}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedWithDeps.includes(option.key)}
                    onChange={() => toggleAddon(option.key)}
                  />
                  {option.name}
                </label>
              </li>
            ))}
          </ul>
        </section>

        <OnboardingTemplateUploads
          setupFile={setupFile}
          menuFile={menuFile}
          onSetupFileChange={setSetupFile}
          onMenuFileChange={setMenuFile}
        />

        <Button type="submit" disabled={busy}>
          {busy
            ? 'Creating…'
            : setupFile || menuFile
              ? 'Create restaurant and load sheets'
              : 'Create restaurant'}
        </Button>
      </form>
    </div>
  )
}
