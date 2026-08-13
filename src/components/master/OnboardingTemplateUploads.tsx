import { CsvSheetPicker } from '@/components/master/CsvSheetPicker'

interface OnboardingTemplateUploadsProps {
  setupFile?: File | null
  menuFile?: File | null
  onSetupFileChange: (file: File | null) => void
  onMenuFileChange: (file: File | null) => void
}

export function OnboardingTemplateUploads({
  setupFile = null,
  menuFile = null,
  onSetupFileChange,
  onMenuFileChange,
}: OnboardingTemplateUploadsProps) {
  return (
    <section className="space-y-5 rounded-[var(--radius-card)] border border-black/10 bg-surface p-5">
      <div>
        <h2 className="text-lg font-semibold">Upload filled sheets (optional)</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Skip if the owner has not sent the files yet. You can add them later
          on Additional details. Choose a file, then Validate before creating.
        </p>
      </div>
      <CsvSheetPicker
        label="Restaurant setup file"
        kind="setup"
        file={setupFile}
        onFileChange={onSetupFileChange}
      />
      <CsvSheetPicker
        label="Menu file"
        kind="menu"
        file={menuFile}
        onFileChange={onMenuFileChange}
      />
    </section>
  )
}
