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
    <section className="space-y-3 rounded-[var(--radius-card)] border border-black/10 bg-surface p-5">
      <div>
        <h2 className="text-lg font-semibold">Upload filled sheets (optional)</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Skip if the owner has not sent the files yet. You can add them later
          on Additional details. Use CSV (Excel: File → Save As → CSV).
        </p>
      </div>
      <label className="block text-sm">
        <span className="font-medium">Restaurant setup file</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="mt-1 block w-full text-sm"
          onChange={(event) =>
            onSetupFileChange(event.target.files?.[0] ?? null)
          }
        />
        {setupFile && (
          <span className="mt-1 block text-xs text-text-secondary">
            Selected: {setupFile.name}
          </span>
        )}
      </label>
      <label className="block text-sm">
        <span className="font-medium">Menu file</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="mt-1 block w-full text-sm"
          onChange={(event) =>
            onMenuFileChange(event.target.files?.[0] ?? null)
          }
        />
        {menuFile && (
          <span className="mt-1 block text-xs text-text-secondary">
            Selected: {menuFile.name}
          </span>
        )}
      </label>
    </section>
  )
}
