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
}

export function OnboardingTemplateDownloads({
  setupValues,
  restaurantName,
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
          Excel or Google Sheets. Attach filled files at the bottom of this
          page, or later on Additional details.
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
    </section>
  )
}
