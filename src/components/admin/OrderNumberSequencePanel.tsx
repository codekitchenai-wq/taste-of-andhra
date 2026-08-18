import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useSelectedBranch } from '@/hooks/useSelectedBranch'
import * as settingsService from '@/services/settingsService'
import type { OrderNumberSequenceSettings } from '@/types/OrderNumberSequence'
import { previewOrderNumber } from '@/utils/orderNumber'
import { defaultOrderNumberSequence } from '@/utils/tenantFeatures'

const GLOBAL_SCOPE = 'global'

export function OrderNumberSequencePanel() {
  const org = useOrganization()
  const { branches } = useSelectedBranch()
  const tenantDefault = useMemo(
    () => defaultOrderNumberSequence({ slug: org.slug }),
    [org.slug],
  )
  const [scope, setScope] = useState(GLOBAL_SCOPE)
  const [prefix, setPrefix] = useState(tenantDefault.prefix)
  const [includeDate, setIncludeDate] = useState(tenantDefault.includeDate)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const branchId = scope === GLOBAL_SCOPE ? null : scope

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    void settingsService.getOrderNumberSequence(branchId).then((result) => {
      if (cancelled) return
      if (result.success) {
        setPrefix(result.data.prefix)
        setIncludeDate(result.data.includeDate)
      }
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [branchId])

  const draft: OrderNumberSequenceSettings = useMemo(
    () => ({
      prefix,
      includeDate,
    }),
    [prefix, includeDate],
  )

  const preview = useMemo(() => previewOrderNumber(draft), [draft])

  const handleSave = async () => {
    setIsSaving(true)
    const result = await settingsService.setOrderNumberSequence(branchId, draft)
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setPrefix(result.data.prefix)
    setIncludeDate(result.data.includeDate)
    toast.success(
      branchId
        ? 'Branch order number sequence saved'
        : 'Default order number sequence saved',
    )
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">
          Order number sequence
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          Set the prefix used for new orders. Branch settings override the
          default when that branch fulfils the order. The last 4 digits stay
          highlighted for kitchen staff.
        </p>
      </div>

      {branches.length > 0 && (
        <div className="mt-4 max-w-md">
          <Select
            label="Applies to"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            options={[
              { value: GLOBAL_SCOPE, label: 'All branches (default)' },
              ...branches.map((branch) => ({
                value: branch.id,
                label: `${branch.name}${branch.is_default ? ' (default branch)' : ''}`,
              })),
            ]}
          />
        </div>
      )}

      {isLoading ? (
        <p className="mt-4 text-sm text-text-secondary">Loading sequence…</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid max-w-xl gap-3 sm:grid-cols-2">
            <Input
              label="Prefix"
              value={prefix}
              maxLength={8}
              onChange={(event) => setPrefix(event.target.value)}
              placeholder={tenantDefault.prefix}
            />
            <label className="flex items-end gap-2 pb-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={includeDate}
                onChange={(event) => setIncludeDate(event.target.checked)}
              />
              Include date (YYYYMMDD)
            </label>
          </div>

          <div className="rounded-[var(--radius-button)] bg-background px-4 py-3">
            <p className="text-xs text-text-secondary">Preview</p>
            <p className="mt-1 font-heading text-lg">
              <OrderNumberDisplay value={preview} />
            </p>
          </div>

          <Button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? 'Saving…' : 'Save sequence'}
          </Button>
        </div>
      )}
    </section>
  )
}
