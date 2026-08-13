import { useEffect, useState } from 'react'
import { Receipt } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DEFAULT_GST_SETTINGS } from '@/constants/GST'
import * as settingsService from '@/services/settingsService'

export function GstSettingsPanel() {
  const [enabled, setEnabled] = useState(DEFAULT_GST_SETTINGS.enabled)
  const [gstin, setGstin] = useState(DEFAULT_GST_SETTINGS.gstin)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    void settingsService.getGstSettings().then((result) => {
      if (cancelled) return
      if (result.success) {
        setEnabled(result.data.enabled)
        setGstin(result.data.gstin)
      }
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    const result = await settingsService.setGstSettings({ enabled, gstin })
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setEnabled(result.data.enabled)
    setGstin(result.data.gstin)
    toast.success(
      result.data.enabled
        ? 'GST enabled. New orders include 5% GST and customers can download invoices.'
        : 'GST turned off. New orders will not include GST or invoices.',
    )
  }

  if (isLoading) {
    return (
      <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <h3 className="text-lg font-semibold text-text-primary">GST</h3>
        <p className="mt-2 text-sm text-text-secondary">Loading…</p>
      </section>
    )
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            <Receipt className="h-5 w-5" />
            GST
          </h3>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            Leave this off if your restaurant is not GST-registered. Turn it on
            to charge 5% GST on new orders and let customers download a GST
            invoice.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={enabled}
            disabled={isSaving}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Enable GST
        </label>
      </div>

      {enabled && (
        <div className="mt-4 max-w-md">
          <Input
            label="GSTIN"
            value={gstin}
            disabled={isSaving}
            onChange={(event) => setGstin(event.target.value)}
            placeholder="29ABCDE1234F1Z5"
          />
          <p className="mt-1 text-xs text-text-secondary">
            Required to issue invoices. Branch GSTIN is used when this is empty.
          </p>
        </div>
      )}

      <Button
        type="button"
        className="mt-4"
        disabled={isSaving}
        onClick={() => void handleSave()}
      >
        {isSaving ? 'Saving…' : 'Save GST settings'}
      </Button>
    </section>
  )
}
