import { useEffect, useRef } from 'react'
import { ExternalLink, Star } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/home/SectionHeader'
import { useOrganization } from '@/contexts/OrganizationContext'
import { restaurantDisplayName } from '@/utils/tenantFeatures'
import {
  googleReadReviewsUrl,
  googleReviewsFromSettings,
  googleWriteReviewUrl,
  isGooglePlaceConfigured,
  isGoogleReviewsWidgetConfigured,
  parseGoogleReviewsWidgetMount,
  shouldShowGoogleReviewsSection,
} from '@/utils/googleReviews'

/**
 * Shows this restaurant’s Google reviews. Prefers a hosted widget when
 * configured; otherwise links customers to read/write on Google for this
 * Place ID only — never another restaurant’s listing.
 */
export function GoogleReviews() {
  const org = useOrganization()
  const config = googleReviewsFromSettings(org.settings)
  const containerRef = useRef<HTMLDivElement>(null)
  const restaurantName = restaurantDisplayName({
    name: org.name,
    slug: org.slug,
    organizationId: org.organizationId,
  })

  const showWidget = isGoogleReviewsWidgetConfigured(config)
  const showPlaceLinks = isGooglePlaceConfigured(config)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !showWidget) return

    const script = document.createElement('script')
    script.src = config.widgetSrc
    script.async = true
    script.defer = true
    container.appendChild(script)

    return () => {
      container.replaceChildren()
    }
  }, [showWidget, config.widgetSrc])

  if (!shouldShowGoogleReviewsSection(config)) return null

  const writeUrl = googleWriteReviewUrl(config.placeId)
  const readUrl = googleReadReviewsUrl(config.placeId)
  const widgetMount = parseGoogleReviewsWidgetMount(config.widgetClass)

  return (
    <section className="bg-surface py-12 md:py-16 lg:py-20">
      <Container as="div">
        <SectionHeader
          title="What Our Customers Say"
          subtitle={`Real Google reviews for ${restaurantName}`}
        />

        {showWidget ? (
          <div className="mt-10">
            {widgetMount ? (
              <div
                className={widgetMount.className}
                {...(widgetMount.embedId
                  ? { 'data-embed-id': widgetMount.embedId }
                  : {})}
              />
            ) : null}
            <div ref={containerRef} />
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-xl rounded-[var(--radius-card)] border border-black/5 bg-background p-6 text-center shadow-sm">
            <div className="flex justify-center gap-1" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className="h-5 w-5 fill-accent text-accent"
                />
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              See what diners are saying about {restaurantName} on Google, or
              share your own experience after your meal.
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              {writeUrl ? (
                <a
                  href={writeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
                >
                  Write a Google review
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : null}
              {readUrl ? (
                <a
                  href={readUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-dark"
                >
                  Read reviews on Google
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>
        )}

        {showWidget && showPlaceLinks ? (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-center">
            {readUrl ? (
              <a
                href={readUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-dark"
              >
                Read all reviews on Google
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
            {writeUrl ? (
              <a
                href={writeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-dark"
              >
                Write a review
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        ) : null}
      </Container>
    </section>
  )
}
