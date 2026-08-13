import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { OnboardingPack } from '@/components/master/OnboardingPack'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  ADDON_FEATURE_OPTIONS,
  DEFAULT_TRIAL_DAYS,
  expandSelectedAddons,
} from '@/constants/ONBOARDING'
import { ROUTES } from '@/constants/ROUTES'
import {
  onboardRestaurant,
  type OnboardRestaurantResult,
} from '@/services/onboardingService'
import { generateSlug } from '@/utils/slug'

export default function MasterOnboardTenantPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [publicPhone, setPublicPhone] = useState('')
  const [city, setCity] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [trialDays, setTrialDays] = useState(String(DEFAULT_TRIAL_DAYS))
  const [addons, setAddons] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<OnboardRestaurantResult | null>(null)

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
      trialDays: Number(trialDays) || DEFAULT_TRIAL_DAYS,
      addonKeys: addons,
    })
    setBusy(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setCreated(result.data)
    if (result.data.inviteError) {
      toast.error(result.data.inviteError)
    } else {
      toast.success(`${result.data.name} created`)
    }
  }

  if (created) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold">Restaurant created</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {created.name} ({created.slug}) is on a trial. Share the pack, then
            import their menu when they send the CSV.
          </p>
        </div>
        {created.inviteError && (
          <p className="rounded-[var(--radius-card)] border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {created.inviteError}
          </p>
        )}
        <OnboardingPack
          restaurantName={created.name}
          ownerEmail={created.ownerEmail}
          temporaryPassword={created.temporaryPassword}
          existingUser={created.existingUser}
        />
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            to={ROUTES.MASTER.tenant(created.organizationId)}
            className="text-primary hover:underline"
          >
            Open tenant · import menu
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
          You create the tenant and turn on add-ons. The owner fills the
          profile + menu templates. They cannot enable or disable features.
        </p>
      </div>

      <form className="space-y-8" onSubmit={(event) => void onSubmit(event)}>
        <section className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Restaurant name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            label="URL slug"
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
          <Input
            label="Trial days"
            type="number"
            min={1}
            value={trialDays}
            onChange={(event) => setTrialDays(event.target.value)}
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

        <Button type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create restaurant'}
        </Button>
      </form>
    </div>
  )
}
