import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { STARTER_PLAN_ID } from '@/constants/ONBOARDING'
import * as subscriptionService from '@/services/subscriptionService'
import type { PlanSummary, OrgSubscriptionView } from '@/services/subscriptionService'
import type { SubscriptionStatus } from '@/types/Organization'

const STATUS_OPTIONS: { value: SubscriptionStatus; label: string }[] = [
  { value: 'trialing', label: 'Trialing' },
  { value: 'active', label: 'Active' },
  { value: 'past_due', label: 'Past due' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
]

function defaultPeriodEndIso(days = 30): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return defaultPeriodEndIso()
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return defaultPeriodEndIso()
  return d.toISOString().slice(0, 10)
}

interface MasterSubscriptionPanelProps {
  organizationId: string
  organizationStatus: string
  onOrganizationStatusChange?: (status: string) => void
}

export function MasterSubscriptionPanel({
  organizationId,
  organizationStatus,
  onOrganizationStatusChange,
}: MasterSubscriptionPanelProps) {
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [subscription, setSubscription] = useState<OrgSubscriptionView | null>(
    null,
  )
  const [planId, setPlanId] = useState(STARTER_PLAN_ID)
  const [status, setStatus] = useState<SubscriptionStatus>('active')
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEndIso(365))
  const [providerRef, setProviderRef] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orgBusy, setOrgBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [plansResult, subResult] = await Promise.all([
        subscriptionService.listActivePlans(),
        subscriptionService.getOrgSubscription(organizationId),
      ])
      if (cancelled) return

      if (plansResult.success) setPlans(plansResult.data)
      if (subResult.success && subResult.data) {
        setSubscription(subResult.data)
        setPlanId(subResult.data.plan_id)
        setStatus(subResult.data.status)
        setPeriodEnd(toDateInput(subResult.data.current_period_end))
        setProviderRef(subResult.data.provider_ref ?? '')
      } else {
        setSubscription(null)
        setPlanId(STARTER_PLAN_ID)
        setStatus('active')
        setPeriodEnd(defaultPeriodEndIso(365))
        setProviderRef('')
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [organizationId])

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    const result = await subscriptionService.upsertOrgSubscription(
      organizationId,
      {
        planId,
        status,
        currentPeriodEnd: new Date(`${periodEnd}T23:59:59.000Z`).toISOString(),
        providerRef: providerRef.trim() || null,
      },
    )
    setSaving(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setSubscription(result.data)
    toast.success(
      `Subscription set to ${result.data.plan?.name ?? 'plan'} (${result.data.status})`,
    )
  }

  async function setOrgStatus(
    next: 'active' | 'trialing' | 'suspended' | 'cancelled',
  ) {
    setOrgBusy(true)
    const result = await subscriptionService.setOrganizationStatus(
      organizationId,
      next,
    )
    setOrgBusy(false)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    onOrganizationStatusChange?.(result.data.status)
    toast.success(`Restaurant status: ${result.data.status}`)
  }

  if (loading) {
    return (
      <section className="rounded-[var(--radius-card)] border border-black/10 bg-surface p-5">
        <h2 className="text-lg font-semibold">Subscription</h2>
        <p className="mt-2 text-sm text-text-secondary">Loading…</p>
      </section>
    )
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-black/10 bg-surface p-5">
      <h2 className="text-lg font-semibold">Subscription</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Starter is free (Direct UPI + COD). Growth adds WhatsApp/SMS. Pro adds
        Razorpay and more. Feature toggles still work as manual overrides.
      </p>

      {subscription?.plan && (
        <p className="mt-3 text-sm">
          Current:{' '}
          <span className="font-medium">
            {subscription.plan.name} · {subscription.status}
          </span>
          <span className="text-text-secondary">
            {' '}
            · ends {toDateInput(subscription.current_period_end)}
          </span>
        </p>
      )}

      <form onSubmit={(e) => void onSave(e)} className="mt-4 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-text-primary">Plan</span>
          <select
            className="mt-1 w-full rounded-[var(--radius-input)] border border-black/15 bg-white px-3 py-2"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
                {plan.price_monthly > 0
                  ? ` · ₹${plan.price_monthly}/mo`
                  : ' · Free'}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-text-primary">Status</span>
          <select
            className="mt-1 w-full rounded-[var(--radius-input)] border border-black/15 bg-white px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Input
          label="Period end"
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
          required
        />

        <Input
          label="Reference note (optional)"
          value={providerRef}
          onChange={(e) => setProviderRef(e.target.value)}
          placeholder="Invoice # / commitment note"
        />

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save subscription'}
        </Button>
      </form>

      <div className="mt-6 border-t border-black/10 pt-4">
        <p className="text-sm font-medium text-text-primary">
          Restaurant access ({organizationStatus})
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={orgBusy || organizationStatus === 'active'}
            onClick={() => void setOrgStatus('active')}
          >
            Activate
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={orgBusy || organizationStatus === 'suspended'}
            onClick={() => void setOrgStatus('suspended')}
          >
            Suspend
          </Button>
        </div>
      </div>
    </section>
  )
}
