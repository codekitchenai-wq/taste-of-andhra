import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { DEFAULT_PRINTER_SETTINGS } from '@/constants/PRINTER'
import * as printerService from '@/services/printerService'
import type { PrinterMode, PrinterSettings } from '@/types/Printer'

export function PrinterSettingsPanel() {
  const [form, setForm] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    void printerService.getPrinterSettings().then((result) => {
      if (cancelled) return
      if (result.success) setForm(result.data)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    const result = await printerService.setPrinterSettings(form)
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setForm(result.data)
    toast.success('Printer settings saved')
  }

  const handleTestAgent = async () => {
    setIsTesting(true)
    const result = await printerService.checkPrintAgentHealth(form.agentUrl)
    setIsTesting(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(
      result.data.printers.length
        ? `Agent online · printers: ${result.data.printers.join(', ')}`
        : 'Agent online',
    )
  }

  if (isLoading) {
    return (
      <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
        <h3 className="text-lg font-semibold text-text-primary">Printers</h3>
        <p className="mt-2 text-sm text-text-secondary">Loading…</p>
      </section>
    )
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            <Printer className="h-5 w-5" />
            Bill & Kitchen Printers
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Like Swiggy / Zomato: on confirm, print a bill at the counter and a
            KOT in the kitchen for every order (app + phone).
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.enabled}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, enabled: event.target.checked }))
            }
          />
          Enable printing
        </label>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Select
          label="Print mode"
          options={[
            { value: 'agent', label: 'Local print agent (recommended)' },
            { value: 'browser', label: 'Browser print dialog' },
          ]}
          value={form.mode}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              mode: event.target.value as PrinterMode,
            }))
          }
        />
        <label className="flex items-end gap-2 pb-2 text-sm text-text-primary">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.autoPrintOnConfirm}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                autoPrintOnConfirm: event.target.checked,
              }))
            }
          />
          Auto-print when order is confirmed
        </label>
      </div>

      {form.mode === 'agent' && (
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            label="Print agent URL"
            value={form.agentUrl}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, agentUrl: event.target.value }))
            }
            placeholder="http://127.0.0.1:9101"
          />
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              disabled={isTesting}
              onClick={() => void handleTestAgent()}
            >
              {isTesting ? 'Testing…' : 'Test agent'}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-[var(--radius-button)] bg-background p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.billing.enabled}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  billing: { ...prev.billing, enabled: event.target.checked },
                }))
              }
            />
            Billing counter printer
          </label>
          <Input
            className="mt-3"
            label="Label"
            value={form.billing.label}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                billing: { ...prev.billing, label: event.target.value },
              }))
            }
          />
          {form.mode === 'agent' && (
            <Input
              className="mt-3"
              label="Agent printer id"
              value={form.billing.agentPrinterId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  billing: {
                    ...prev.billing,
                    agentPrinterId: event.target.value,
                  },
                }))
              }
              placeholder="billing"
            />
          )}
        </div>

        <div className="rounded-[var(--radius-button)] bg-background p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.kitchen.enabled}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  kitchen: { ...prev.kitchen, enabled: event.target.checked },
                }))
              }
            />
            Kitchen KOT printer
          </label>
          <Input
            className="mt-3"
            label="Label"
            value={form.kitchen.label}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                kitchen: { ...prev.kitchen, label: event.target.value },
              }))
            }
          />
          {form.mode === 'agent' && (
            <Input
              className="mt-3"
              label="Agent printer id"
              value={form.kitchen.agentPrinterId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  kitchen: {
                    ...prev.kitchen,
                    agentPrinterId: event.target.value,
                  },
                }))
              }
              placeholder="kitchen"
            />
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-text-secondary">
        Full hardware setup: see{' '}
        <code className="rounded bg-background px-1">docs/PRINTER_SETUP.md</code>
        . Recommended: two 80mm Ethernet thermal printers + local print agent on
        the billing PC.
      </p>

      <div className="mt-4">
        <Button
          type="button"
          disabled={isSaving}
          onClick={() => void handleSave()}
        >
          {isSaving ? 'Saving…' : 'Save printer settings'}
        </Button>
      </div>
    </section>
  )
}
