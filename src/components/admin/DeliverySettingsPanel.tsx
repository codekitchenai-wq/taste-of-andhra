import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useSelectedBranch } from '@/hooks/useSelectedBranch'
import * as deliverySettingsService from '@/services/deliverySettingsService'
import type {
  DeliveryProvider,
  DeliverySettings,
} from '@/types/DeliverySettings'
import { formatPrice } from '@/utils/format'

const GLOBAL_SCOPE = 'global'

interface FormState {
  provider: DeliveryProvider
  isEnabled: boolean
  pincodeText: string
  maxDistanceKm: string
  requireLocationPin: boolean
  serviceAreaNote: string
  markupFlat: string
  markupPercent: string
  fallbackCharge: string
  freeDeliveryThreshold: string
}

function toFormState(settings: DeliverySettings): FormState {
  return {
    provider: settings.provider,
    isEnabled: settings.is_enabled,
    pincodeText: settings.service_pincodes.join(', '),
    maxDistanceKm: settings.max_distance_km?.toString() ?? '',
    requireLocationPin: settings.require_location_pin,
    serviceAreaNote: settings.service_area_note ?? '',
    markupFlat: settings.markup_flat.toString(),
    markupPercent: settings.markup_percent.toString(),
    fallbackCharge: settings.fallback_charge.toString(),
    freeDeliveryThreshold: settings.free_delivery_threshold?.toString() ?? '',
  }
}

function toNumberOrNull(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function DeliverySettingsPanel() {
  const { branches } = useSelectedBranch()
  const [scope, setScope] = useState<string>(GLOBAL_SCOPE)
  const [form, setForm] = useState<FormState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const branchId = scope === GLOBAL_SCOPE ? null : scope

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    void deliverySettingsService
      .getDeliverySettings(branchId)
      .then((result) => {
        if (cancelled) return
        if (result.success) {
          setForm(toFormState(result.data))
        }
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [branchId])

  const parsedPincodes = useMemo(
    () =>
      form
        ? deliverySettingsService.parsePincodeList(form.pincodeText)
        : { pincodes: [], invalid: [] },
    [form],
  )

  // These settings apply to whichever branch fulfils the order, so the global
  // scope is described against the default branch.
  const scopeBranch = useMemo(
    () =>
      branchId
        ? (branches.find((branch) => branch.id === branchId) ?? null)
        : (branches.find((branch) => branch.is_default) ?? null),
    [branches, branchId],
  )

  const maxDistanceKm = form ? toNumberOrNull(form.maxDistanceKm) : null

  const areaSummary = useMemo(() => {
    if (!form) return ''

    return deliverySettingsService.describeServiceArea(
      {
        ...deliverySettingsService.DEFAULT_DELIVERY_SETTINGS,
        max_distance_km: maxDistanceKm,
        service_pincodes: parsedPincodes.pincodes,
      },
      scopeBranch?.name,
    )
  }, [form, maxDistanceKm, parsedPincodes.pincodes, scopeBranch])

  // Distance is measured from the branch pin, so an unpinned branch silently
  // disables the rule. Admins need to know before they rely on it.
  const branchesMissingCoordinates = useMemo(() => {
    const candidates = branchId
      ? branches.filter((branch) => branch.id === branchId)
      : branches.filter((branch) => branch.is_active)

    return candidates.filter(
      (branch) => branch.latitude === null || branch.longitude === null,
    )
  }, [branches, branchId])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) =>
      previous ? { ...previous, [key]: value } : previous,
    )
  }

  const handleSave = async () => {
    if (!form) return

    if (parsedPincodes.invalid.length > 0) {
      toast.error(
        `Not valid 6-digit pincodes: ${parsedPincodes.invalid.join(', ')}`,
      )
      return
    }

    setIsSaving(true)

    const result = await deliverySettingsService.saveDeliverySettings(branchId, {
      provider: form.provider,
      isEnabled: form.isEnabled,
      servicePincodes: parsedPincodes.pincodes,
      maxDistanceKm,
      requireLocationPin: form.requireLocationPin,
      serviceAreaNote: form.serviceAreaNote,
      markupFlat: toNumberOrNull(form.markupFlat) ?? 0,
      markupPercent: toNumberOrNull(form.markupPercent) ?? 0,
      fallbackCharge: toNumberOrNull(form.fallbackCharge) ?? 0,
      freeDeliveryThreshold: toNumberOrNull(form.freeDeliveryThreshold),
    })

    setIsSaving(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setForm(toFormState(result.data))
    toast.success('Delivery settings saved')
  }

  if (isLoading || !form) {
    return (
      <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <p className="text-sm text-text-secondary">
          Loading delivery settings...
        </p>
      </section>
    )
  }

  const isPidge = form.provider === 'pidge'

  return (
    <section className="space-y-6 rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">
          Delivery & Service Areas
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          Choose who delivers your orders and where you accept them. Addresses
          outside your service area cannot check out.
        </p>
      </div>

      {branches.length > 0 && (
        <Select
          label="Applies to"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          options={[
            { value: GLOBAL_SCOPE, label: 'All branches (default)' },
            ...branches.map((branch) => ({
              value: branch.id,
              label: `${branch.name} — ${branch.city}`,
            })),
          ]}
        />
      )}

      <div className="space-y-4 border-t border-black/5 pt-5">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Service area
        </h4>

        <div className="flex items-start gap-3 rounded-[var(--radius-card)] bg-primary/5 p-4">
          <MapPin
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-text-primary" aria-live="polite">
            {areaSummary}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Max delivery distance (km)"
            type="number"
            min={0}
            step="0.5"
            placeholder="No limit"
            value={form.maxDistanceKm}
            onChange={(event) => update('maxDistanceKm', event.target.value)}
          />
          <Input
            label="Free delivery above (₹)"
            type="number"
            min={0}
            placeholder="No free delivery"
            value={form.freeDeliveryThreshold}
            onChange={(event) =>
              update('freeDeliveryThreshold', event.target.value)
            }
          />
        </div>

        <p className="-mt-2 text-xs text-text-secondary">
          Measured in a straight line from your branch pin to the address the
          customer pinned on the map.
        </p>

        {maxDistanceKm !== null && branchesMissingCoordinates.length > 0 && (
          <div
            className="flex items-start gap-3 rounded-[var(--radius-card)] border border-warning/30 bg-warning/5 p-4"
            role="alert"
          >
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-warning"
              aria-hidden="true"
            />
            <p className="text-sm text-text-secondary">
              The distance limit is skipped for{' '}
              {branchesMissingCoordinates
                .map((branch) => branch.name)
                .join(', ')}{' '}
              until you set the branch location under Branches.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Textarea
            label="Serviceable pincodes"
            placeholder="560034, 560095, 411001"
            rows={3}
            value={form.pincodeText}
            onChange={(event) => update('pincodeText', event.target.value)}
          />
          <p className="text-xs text-text-secondary">
            {parsedPincodes.pincodes.length === 0
              ? 'Empty means you accept every pincode. Add pincodes to restrict where customers can order.'
              : `${parsedPincodes.pincodes.length} pincode${parsedPincodes.pincodes.length === 1 ? '' : 's'} accepted. Orders to any other pincode are blocked at checkout.`}
          </p>
          {parsedPincodes.invalid.length > 0 && (
            <p className="text-xs text-error">
              Ignoring invalid entries: {parsedPincodes.invalid.join(', ')}
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] bg-background p-4">
          <input
            type="checkbox"
            checked={form.requireLocationPin}
            onChange={(event) =>
              update('requireLocationPin', event.target.checked)
            }
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">
            <span className="font-medium text-text-primary">
              Require customers to pin their location
            </span>
            <span className="mt-1 block text-text-secondary">
              Addresses saved without a map pin are rejected. Turn this on when
              you rely on the distance limit, so nobody can order from outside
              it by typing an address by hand.
            </span>
          </span>
        </label>

        <div className="space-y-2">
          <Textarea
            label="Service area note for customers"
            placeholder="We deliver across Jubilee Hills, Banjara Hills and Madhapur."
            rows={2}
            value={form.serviceAreaNote}
            onChange={(event) => update('serviceAreaNote', event.target.value)}
          />
          <p className="text-xs text-text-secondary">
            Shown at checkout. Leave empty to show your distance and pincode
            rules instead.
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t border-black/5 pt-5">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Who delivers
        </h4>

        <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] bg-background p-4">
          <input
            type="checkbox"
            checked={form.isEnabled}
            onChange={(event) => update('isEnabled', event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">
            <span className="font-medium text-text-primary">
              Use a third-party delivery partner
            </span>
            <span className="mt-1 block text-text-secondary">
              When off, orders are assigned to your own delivery staff and
              customers are charged your standard rate.
            </span>
          </span>
        </label>

        {form.isEnabled && (
          <Select
            label="Provider"
            value={form.provider}
            onChange={(event) =>
              update('provider', event.target.value as DeliveryProvider)
            }
            options={[
              { value: 'pidge', label: 'Pidge' },
              { value: 'own', label: 'Own fleet only' },
            ]}
          />
        )}

        {isPidge && form.isEnabled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Markup per order (₹)"
              type="number"
              min={0}
              step="1"
              value={form.markupFlat}
              onChange={(event) => update('markupFlat', event.target.value)}
            />
            <Input
              label="Markup (%)"
              type="number"
              min={0}
              max={100}
              step="1"
              value={form.markupPercent}
              onChange={(event) => update('markupPercent', event.target.value)}
            />
          </div>
        )}

        <Input
          label="Fallback delivery charge (₹)"
          type="number"
          min={0}
          value={form.fallbackCharge}
          onChange={(event) => update('fallbackCharge', event.target.value)}
        />
        <p className="-mt-3 text-xs text-text-secondary">
          Charged when the provider is unreachable or returns no price, so a
          checkout never fails. Currently{' '}
          {formatPrice(toNumberOrNull(form.fallbackCharge) ?? 0)}.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save delivery settings'}
        </Button>
      </div>
    </section>
  )
}
