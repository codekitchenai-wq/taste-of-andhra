import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { setOrgFeature } from '@/services/entitlementService'
import type { OrgFeatureState } from '@/types/Organization'
import { cn } from '@/utils/cn'

interface MasterFeatureTogglesProps {
  organizationId: string
  features: OrgFeatureState[]
  subscriptionActive: boolean
  onUpdated: () => void
}

function featureName(
  features: OrgFeatureState[],
  key: string,
): string {
  return features.find((item) => item.feature_key === key)?.name ?? key
}

export function MasterFeatureToggles({
  organizationId,
  features,
  subscriptionActive,
  onUpdated,
}: MasterFeatureTogglesProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [cascadeTarget, setCascadeTarget] = useState<{
    feature: OrgFeatureState
    blockedBy: string[]
  } | null>(null)

  const namesByKey = useMemo(() => {
    return new Map(features.map((item) => [item.feature_key, item.name]))
  }, [features])

  async function applyToggle(
    feature: OrgFeatureState,
    enabled: boolean,
    cascade = false,
  ) {
    setPendingKey(feature.feature_key)
    const result = await setOrgFeature(
      organizationId,
      feature.feature_key,
      enabled,
      cascade,
    )
    setPendingKey(null)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    if (!result.data.ok && result.data.code === 'DEPENDENTS_ENABLED') {
      setCascadeTarget({
        feature,
        blockedBy: result.data.blocked_by ?? feature.enabled_dependents,
      })
      return
    }

    if (!result.data.ok) {
      toast.error(result.data.message || 'Could not update feature')
      return
    }

    const changed = result.data.changed.filter(
      (key) => key !== feature.feature_key,
    )
    const extra = changed
      .map((key) => namesByKey.get(key) ?? key)
      .join(', ')

    if (enabled && extra) {
      toast.success(`${feature.name} enabled (also on: ${extra})`)
    } else if (!enabled && extra) {
      toast.success(`${feature.name} disabled (also off: ${extra})`)
    } else {
      toast.success(result.data.message || `${feature.name} updated`)
    }

    onUpdated()
  }

  async function confirmCascade() {
    if (!cascadeTarget) return
    const target = cascadeTarget.feature
    setCascadeTarget(null)
    await applyToggle(target, false, true)
  }

  return (
    <>
      <p className="mb-3 rounded-[var(--radius-card)] border border-black/10 bg-black/[0.03] px-3 py-2 text-sm text-text-secondary">
        These switches are platform-admin only. The restaurant cannot turn
        modules on or off from their admin.
      </p>
      {!subscriptionActive && (
        <p className="mb-3 rounded-[var(--radius-card)] border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This restaurant's subscription is not active. Modules stay off for
          staff until the trial or paid period is valid — you can still set
          entitlements for when it is.
        </p>
      )}

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-black/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-black/5 text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="px-3 py-2">Feature</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Requires</th>
              <th className="px-3 py-2">This restaurant</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => {
              const busy = pendingKey === feature.feature_key
              return (
                <tr key={feature.feature_key} className="border-t border-black/5">
                  <td className="px-3 py-3">
                    <p className="font-medium">{feature.name}</p>
                    <p className="font-mono text-xs text-text-secondary">
                      {feature.feature_key}
                    </p>
                    {feature.description && (
                      <p className="mt-1 text-xs text-text-secondary">
                        {feature.description}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-text-secondary">
                    {feature.is_core
                      ? 'Core'
                      : feature.is_add_on
                        ? 'Add-on'
                        : 'Optional'}
                  </td>
                  <td className="px-3 py-3 text-xs text-text-secondary">
                    {feature.requires.length === 0
                      ? '—'
                      : feature.requires
                          .map((key) => featureName(features, key))
                          .join(', ')}
                  </td>
                  <td className="px-3 py-3">
                    {feature.is_core ? (
                      <span className="text-xs font-medium text-success">
                        Always on
                      </span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={feature.enabled}
                        aria-label={`${feature.enabled ? 'Disable' : 'Enable'} ${feature.name}`}
                        disabled={busy}
                        onClick={() =>
                          void applyToggle(feature, !feature.enabled)
                        }
                        className={cn(
                          'relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50',
                          feature.enabled ? 'bg-primary' : 'bg-gray-300',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                            feature.enabled && 'translate-x-5',
                          )}
                        />
                      </button>
                    )}
                    {feature.enabled && feature.enabled_dependents.length > 0 && (
                      <p className="mt-1 text-xs text-text-secondary">
                        Used by{' '}
                        {feature.enabled_dependents
                          .map((key) => featureName(features, key))
                          .join(', ')}
                      </p>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={Boolean(cascadeTarget)}
        onClose={() => setCascadeTarget(null)}
        title="Turn off related features?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCascadeTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmCascade()}>
              Turn all off
            </Button>
          </div>
        }
      >
        {cascadeTarget && (
          <p className="text-sm text-text-secondary">
            {cascadeTarget.feature.name} is required by{' '}
            <span className="font-medium text-text-primary">
              {cascadeTarget.blockedBy
                .map((key) => featureName(features, key))
                .join(', ')}
            </span>
            . Turning it off will also disable those modules for this
            restaurant.
          </p>
        )}
      </Modal>
    </>
  )
}
