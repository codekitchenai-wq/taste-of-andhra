import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import {
  ONBOARDING_PACK_FILES,
  adminLoginUrl,
  buildOwnerWhatsAppMessage,
} from '@/constants/ONBOARDING'

interface OnboardingPackProps {
  restaurantName: string
  ownerEmail: string
  temporaryPassword?: string | null
  existingUser?: boolean
}

export function OnboardingPack({
  restaurantName,
  ownerEmail,
  temporaryPassword,
  existingUser = false,
}: OnboardingPackProps) {
  const message = buildOwnerWhatsAppMessage({
    restaurantName,
    ownerEmail,
    temporaryPassword,
    existingUser,
    adminLoginUrl: adminLoginUrl(),
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
          Send only three asks: profile template, menu CSV, optional logo.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void copyMessage()}>
          Copy WhatsApp message
        </Button>
        <a href={ONBOARDING_PACK_FILES.profile} download>
          <Button size="sm" variant="secondary">
            Download profile template
          </Button>
        </a>
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
