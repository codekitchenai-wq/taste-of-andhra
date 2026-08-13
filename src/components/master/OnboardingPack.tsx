import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { OnboardingTemplateDownloads } from '@/components/master/OnboardingTemplateDownloads'
import {
  adminLoginUrl,
  buildOwnerWhatsAppMessage,
} from '@/constants/ONBOARDING'
import type { RestaurantSetupValues } from '@/utils/parseRestaurantSetupCsv'

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
          Copy the WhatsApp text, attach the two Excel files, and send. Optional
          logo can wait.
        </p>
      </div>

      <OnboardingTemplateDownloads
        restaurantName={restaurantName}
        setupValues={setupValues}
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void copyMessage()}>
          Copy WhatsApp message
        </Button>
      </div>

      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-[var(--radius-card)] bg-black/[0.04] p-3 text-xs text-text-primary">
        {message}
      </pre>
    </section>
  )
}
