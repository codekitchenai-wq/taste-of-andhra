import { Button } from '@/components/ui/Button'
import { ONBOARDING_PACK_FILES } from '@/constants/ONBOARDING'
import { downloadTextFile } from '@/utils/downloadTextFile'
import {
  buildRestaurantSetupCsv,
  type RestaurantSetupValues,
} from '@/utils/parseRestaurantSetupCsv'

interface OnboardingTemplateDownloadsProps {
  setupValues?: RestaurantSetupValues
  restaurantName?: string
  setupFile?: File | null
  menuFile?: File | null
  onSetupFileChange?: (file: File | null) => void
  onMenuFileChange?: (file: File | null) => void
  showUploads?: boolean
}

export function OnboardingTemplateDownloads({
  setupValues,
  restaurantName,
  setupFile = null,
  menuFile = null,
  onSetupFileChange,
  onMenuFileChange,
  showUploads = false,
}: OnboardingTemplateDownloadsProps) {
  const setupFileName = `${
    restaurantName?.trim().replace(/\s+/g, '-').toLowerCase() || 'restaurant'
  }-setup.csv`

  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-5">
      <div>
        <h2 className="text-lg font-semibold">Excel templates for the owner</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Download these two files and send them on WhatsApp. They open in
          Excel or Google Sheets. When the owner sends them back, attach the
          filled files below.
        </p>
      </div>
      <ul className="space-y-2 text-sm">
        <li>
          <span className="font-medium">1. Restaurant setup</span>
          {' — '}
          address, GST, FSSAI, hours, UPI, delivery pincodes
        </li>
        <li>
          <span className="font-medium">2. Menu list</span>
          {' — '}
          one row per dish (category, name, price, veg)
        </li>
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() =>
            downloadTextFile(
              setupFileName,
              buildRestaurantSetupCsv(setupValues ?? {}),
            )
          }
        >
          Download restaurant setup (Excel)
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const link = document.createElement('a')
            link.href = ONBOARDING_PACK_FILES.menu
            link.download = 'MENU_IMPORT_TEMPLATE.csv'
            document.body.appendChild(link)
            link.click()
            link.remove()
          }}
        >
          Download menu template (Excel)
        </Button>
      </div>
      {showUploads && (
        <div className="space-y-3 border-t border-primary/20 pt-4">
          <h3 className="text-sm font-semibold">Upload filled sheets</h3>
          <p className="text-sm text-text-secondary">
            Attach the CSV files the owner returned (Excel: File → Save As →
            CSV). They are applied when you create the restaurant.
          </p>
          <label className="block text-sm">
            <span className="font-medium">Restaurant setup file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-1 block w-full text-sm"
              onChange={(event) =>
                onSetupFileChange?.(event.target.files?.[0] ?? null)
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
                onMenuFileChange?.(event.target.files?.[0] ?? null)
              }
            />
            {menuFile && (
              <span className="mt-1 block text-xs text-text-secondary">
                Selected: {menuFile.name}
              </span>
            )}
          </label>
        </div>
      )}
    </section>
  )
}
