import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import {
  exportRestaurantSetupCsv,
  importRestaurantSetupCsv,
} from '@/services/onboardingService'
import { downloadTextFile } from '@/utils/downloadTextFile'

interface RestaurantSetupImportProps {
  organizationId: string
  restaurantSlug: string
}

export function RestaurantSetupImport({
  organizationId,
  restaurantSlug,
}: RestaurantSetupImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  async function onDownloadCurrent() {
    setDownloading(true)
    const result = await exportRestaurantSetupCsv(organizationId)
    setDownloading(false)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    downloadTextFile(`${restaurantSlug}-setup.csv`, result.data)
    toast.success('Downloaded current setup values')
  }

  async function onImport() {
    if (!file) {
      toast.error('Choose a filled setup CSV first.')
      return
    }
    setBusy(true)
    const text = await file.text()
    const result = await importRestaurantSetupCsv(organizationId, text)
    setBusy(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    const extra =
      result.data.warnings.length > 0
        ? ` ${result.data.warnings.length} warning(s).`
        : ''
    const message = `Updated ${result.data.updated.join(', ') || 'setup'}.${extra}`
    setSummary(message)
    toast.success(message)
  }

  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border border-black/10 bg-surface p-5">
      <div>
        <h2 className="text-lg font-semibold">Restaurant setup CSV</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Download current values, send to the owner, then upload their edits.
          Empty cells are left unchanged.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={downloading}
          onClick={() => void onDownloadCurrent()}
        >
          {downloading ? 'Preparing…' : 'Download current setup'}
        </Button>
      </div>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="text-sm"
      />
      <Button size="sm" disabled={busy || !file} onClick={() => void onImport()}>
        {busy ? 'Applying…' : 'Upload and apply setup'}
      </Button>
      {summary && <p className="text-sm text-text-secondary">{summary}</p>}
    </section>
  )
}
