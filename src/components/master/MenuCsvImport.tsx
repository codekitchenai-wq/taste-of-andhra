import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { importMenuCsv } from '@/services/onboardingService'

interface MenuCsvImportProps {
  organizationId: string
}

export function MenuCsvImport({ organizationId }: MenuCsvImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [publishImmediately, setPublishImmediately] = useState(false)
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  async function onImport() {
    if (!file) {
      toast.error('Choose a filled menu CSV first.')
      return
    }
    setBusy(true)
    const text = await file.text()
    const result = await importMenuCsv(organizationId, text, publishImmediately)
    setBusy(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    const extra =
      result.data.errors.length > 0
        ? ` ${result.data.errors.length} row warning(s).`
        : ''
    const message = `Imported ${result.data.dishesCreated} dishes (${result.data.categoriesCreated} new categories).${extra}`
    setSummary(message)
    toast.success(message)
  }

  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border border-black/10 bg-surface p-5">
      <div>
        <h2 className="text-lg font-semibold">Import menu CSV</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Use the onboarding template. Dishes stay hidden until you publish, or
          tick publish now after the owner confirmed prices.
        </p>
      </div>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="text-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={publishImmediately}
          onChange={(event) => setPublishImmediately(event.target.checked)}
        />
        Publish dishes immediately (owner already reviewed)
      </label>
      <Button size="sm" disabled={busy || !file} onClick={() => void onImport()}>
        {busy ? 'Importing…' : 'Import menu'}
      </Button>
      {summary && <p className="text-sm text-text-secondary">{summary}</p>}
    </section>
  )
}
