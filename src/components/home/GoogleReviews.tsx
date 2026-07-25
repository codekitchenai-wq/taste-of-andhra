import { useEffect, useRef } from 'react'
import { ExternalLink } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/home/SectionHeader'
import {
  googleReadReviewsUrl,
  googleReviewsWidget,
  isGoogleReviewsConfigured,
} from '@/utils/googleReviews'

/**
 * Embeds a hosted Google reviews widget (Trustindex, Elfsight, etc). The
 * provider handles Google's attribution and caching rules for us, so we only
 * need to drop their loader script into the container they render into.
 */
export function GoogleReviews() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const script = document.createElement('script')
    script.src = googleReviewsWidget.src
    script.async = true
    script.defer = true
    container.appendChild(script)

    return () => {
      container.replaceChildren()
    }
  }, [])

  return (
    <section className="bg-surface py-12 md:py-16 lg:py-20">
      <Container as="div">
        <SectionHeader
          title="What Our Customers Say"
          subtitle="Real reviews from food lovers across the city"
        />

        <div className="mt-10">
          {googleReviewsWidget.containerClass && (
            <div className={googleReviewsWidget.containerClass} />
          )}
          <div ref={containerRef} />
        </div>

        {isGoogleReviewsConfigured && (
          <div className="mt-8 text-center">
            <a
              href={googleReadReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-dark"
            >
              Read all reviews on Google
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        )}
      </Container>
    </section>
  )
}
