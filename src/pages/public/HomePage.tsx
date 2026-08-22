import { useEffect } from 'react'
import { FeaturedCategories } from '@/components/home/FeaturedCategories'
import { FeaturedDishes } from '@/components/home/FeaturedDishes'
import { GoogleReviews } from '@/components/home/GoogleReviews'
import { HeroSection } from '@/components/home/HeroSection'
import { OnamReelSection } from '@/components/home/OnamReelSection'
import { OnamSpecialBanner } from '@/components/home/OnamSpecialBanner'
import { WhyChooseUs } from '@/components/home/WhyChooseUs'
import { LoadingState } from '@/components/ui/LoadingState'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useHomeFeatured } from '@/hooks/useHomeFeatured'
import {
  googleReviewsFromSettings,
  shouldShowGoogleReviewsSection,
} from '@/utils/googleReviews'
import {
  isSpiceMalabarStorefront,
  storefrontPublicMenuEnabled,
} from '@/utils/storefrontCopy'
import { bumpStarterAnalytics } from '@/utils/starterAnalytics'
import { isWebsiteStarterTrack } from '@/utils/websiteStarter'

export default function HomePage() {
  const org = useOrganization()
  const isChopsticks = isSpiceMalabarStorefront(org)
  const showMenuSections = storefrontPublicMenuEnabled(org)
  const { categories, dishes, isLoading } = useHomeFeatured()
  const showGoogleReviews = shouldShowGoogleReviewsSection(
    googleReviewsFromSettings(org.settings),
  )

  useEffect(() => {
    if (isWebsiteStarterTrack(org.settings)) {
      bumpStarterAnalytics(org.organizationId, 'visitors')
    }
  }, [org.organizationId, org.settings])

  // Chopsticks: Onam-focused landing + reel + optional Google reviews for this org only.
  if (isChopsticks) {
    return (
      <>
        <HeroSection />
        <OnamReelSection />
        {showGoogleReviews ? <GoogleReviews /> : null}
      </>
    )
  }

  return (
    <>
      <HeroSection />
      <OnamSpecialBanner />
      {showMenuSections ? (
        isLoading ? (
          <LoadingState variant="inline" className="py-16" />
        ) : (
          <>
            <FeaturedCategories categories={categories} />
            <FeaturedDishes dishes={dishes} />
          </>
        )
      ) : null}
      <WhyChooseUs />
      {showGoogleReviews ? <GoogleReviews /> : null}
    </>
  )
}
