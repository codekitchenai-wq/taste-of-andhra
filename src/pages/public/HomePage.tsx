import { useEffect } from 'react'
import { FeaturedCategories } from '@/components/home/FeaturedCategories'
import { FeaturedDishes } from '@/components/home/FeaturedDishes'
import { GoogleReviews } from '@/components/home/GoogleReviews'
import { HeroSection } from '@/components/home/HeroSection'
import { OnamSpecialBanner } from '@/components/home/OnamSpecialBanner'
import { Testimonials } from '@/components/home/Testimonials'
import { WhyChooseUs } from '@/components/home/WhyChooseUs'
import { LoadingState } from '@/components/ui/LoadingState'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useHomeFeatured } from '@/hooks/useHomeFeatured'
import { isGoogleReviewsWidgetConfigured } from '@/utils/googleReviews'
import { bumpStarterAnalytics } from '@/utils/starterAnalytics'
import { isWebsiteStarterTrack } from '@/utils/websiteStarter'

export default function HomePage() {
  const org = useOrganization()
  const { categories, dishes, isLoading } = useHomeFeatured()
  const showGoogleReviews =
    isGoogleReviewsWidgetConfigured && !org.resolvedFromHost

  useEffect(() => {
    if (isWebsiteStarterTrack(org.settings)) {
      bumpStarterAnalytics(org.organizationId, 'visitors')
    }
  }, [org.organizationId, org.settings])

  return (
    <>
      <HeroSection />
      <OnamSpecialBanner />
      {isLoading ? (
        <LoadingState variant="inline" className="py-16" />
      ) : (
        <>
          <FeaturedCategories categories={categories} />
          <FeaturedDishes dishes={dishes} />
        </>
      )}
      <WhyChooseUs />
      {showGoogleReviews ? <GoogleReviews /> : <Testimonials />}
    </>
  )
}
