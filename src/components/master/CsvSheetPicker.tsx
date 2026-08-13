import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  validateOnboardingCsv,
  type OnboardingSheetKind,
  type SheetValidation,
} from '@/utils/validateOnboardingCsv'

interface CsvSheetPickerProps {
  label: string
  kind: OnboardingSheetKind
  file: File | null
  onFileChange: (file: File | null) => void
}

export function CsvSheetPicker({
  label,
  kind,
  file,
  onFileChange,
}: CsvSheetPickerProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<SheetValidation | null>(null)

  function openPicker() {
    inputRef.current?.click()
  }

  function onPick(next: File | null) {
    onFileChange(next)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function onValidate() {
    if (!file) return
    setChecking(true)
    const text = await file.text()
    setResult(validateOnboardingCsv(kind, text, file.name))
    setChecking(false)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={openPicker}>
          {file ? 'Replace file' : 'Choose file'}
        </Button>
        <Button
          size="sm"
          disabled={!file || checking}
          onClick={() => void onValidate()}
        >
          {checking ? 'Checking…' : 'Validate'}
        </Button>
        {file && (
          <Button size="sm" variant="ghost" onClick={() => onPick(null)}>
            Remove
          </Button>
        )}
      </div>
      {file ? (
        <p className="text-sm text-text-primary">
          File: <span className="font-mono">{file.name}</span>
        </p>
      ) : (
        <p className="text-sm text-text-secondary">No file chosen</p>
      )}
      {result && (
        <div
          className={
            result.ok
              ? 'rounded-[var(--radius-card)] border border-success/30 bg-success/5 px-3 py-2 text-sm'
              : 'rounded-[var(--radius-card)] border border-error/40 bg-error/5 px-3 py-2 text-sm'
          }
        >
          <p className="font-medium">{result.summary}</p>
          {!result.ok && (
            <p className="mt-1 text-text-secondary">
              Fix the rows in Excel, save as CSV, then click Replace file and
              Validate again.
            </p>
          )}
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-error">
              {result.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
          {result.warnings.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
