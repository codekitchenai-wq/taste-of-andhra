import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import {
  ONBOARDING_PACK_FILES,
  adminLoginUrl,
  buildOwnerWhatsAppMessage,
} from '@/constants/ONBOARDING'
import { downloadTextFile } from '@/utils/downloadTextFile'
import {
  buildRestaurantSetupCsv,
  type RestaurantSetupValues,
} from '@/utils/parseRestaurantSetupCsv'

interface OnboardingPackProps {
  restaurantName: string
  ownerEmail: string
  temporaryPassword?: string | null
  existingUser?: boolean
  homepageUrl?: string | null
  setupValues?: RestaurantSetupValues
}

export function OnboardingPack({
  restaurantName,
  ownerEmail,
  temporaryPassword,
  existingUser = false,
  homepageUrl,
  setupValues,
}: OnboardingPackProps) {
  const message = buildOwnerWhatsAppMessage({
    restaurantName,
    ownerEmail,
    temporaryPassword,
    existingUser,
    adminLoginUrl: adminLoginUrl(),
    homepageUrl,
  })

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message)
      toast.success('WhatsApp message copied')
    } catch {
      toast.error('Could not copy. Select the text manually.')
    }
  }

  return (
    <section className="space-y-4 rounded-[var(--radius-card)] border border-black/10 bg-surface p-5">
      <div>
        <h2 className="text-lg font-semibold">Share pack with the restaurant</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Send only three asks: setup CSV, menu CSV, optional logo. Defaults are
          already filled — they only change what is different.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void copyMessage()}>
          Copy WhatsApp message
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            downloadTextFile(
              `${restaurantName.replace(/\s+/g, '-').toLowerCase() || 'restaurant'}-setup.csv`,
              buildRestaurantSetupCsv(setupValues ?? {}),
            )
          }
        >
          Download setup CSV
        </Button>
        <a href={ONBOARDING_PACK_FILES.menu} download>
          <Button size="sm" variant="secondary">
            Download menu CSV
          </Button>
        </a>
      </div>

      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-[var(--radius-card)] bg-black/[0.04] p-3 text-xs text-text-primary">
        {message}
      </pre>
    </section>
  )
}
