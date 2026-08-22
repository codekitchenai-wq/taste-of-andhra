import { Star } from 'lucide-react'
import { useOrganization } from '@/contexts/OrganizationContext'
import {
  googleReviewsFromSettings,
  googleWriteReviewUrl,
  isGooglePlaceConfigured,
} from '@/utils/googleReviews'
import { restaurantDisplayName } from '@/utils/tenantFeatures'

/**
 * Asks every customer for a Google review once their order lands. Google
 * prohibits only soliciting happy customers, so this is shown regardless of
 * what the customer rated us in-app. Uses this restaurant’s Place ID only.
 */
export function GoogleReviewPrompt() {
  const org = useOrganization()
  const config = googleReviewsFromSettings(org.settings)
  if (!isGooglePlaceConfigured(config)) return null

  const writeUrl = googleWriteReviewUrl(config.placeId)
  if (!writeUrl) return null

  const name = restaurantDisplayName({
    name: org.name,
    slug: org.slug,
    organizationId: org.organizationId,
  })

  return (
    <div className="rounded-[var(--radius-card)] border border-accent/30 bg-accent/5 p-4">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-text-primary">
          Enjoyed your meal?
        </h3>
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        A quick review on Google helps other food lovers find {name}.
      </p>
      <a
        href={writeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
      >
        Review us on Google
      </a>
    </div>
  )
}
