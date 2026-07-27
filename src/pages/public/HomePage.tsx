import { FeaturedCategories } from '@/components/home/FeaturedCategories'
import { FeaturedDishes } from '@/components/home/FeaturedDishes'
import { GoogleReviews } from '@/components/home/GoogleReviews'
import { HeroSection } from '@/components/home/HeroSection'
import { Testimonials } from '@/components/home/Testimonials'
import { WhyChooseUs } from '@/components/home/WhyChooseUs'
import { LoadingState } from '@/components/ui/LoadingState'
import { useHomeFeatured } from '@/hooks/useHomeFeatured'
import { isGoogleReviewsWidgetConfigured } from '@/utils/googleReviews'

export default function HomePage() {
  const { categories, dishes, isLoading } = useHomeFeatured()

  return (
    <>
      <HeroSection />
      {isLoading ? (
        <LoadingState variant="inline" className="py-16" />
      ) : (
        <>
          <FeaturedCategories categories={categories} />
          <FeaturedDishes dishes={dishes} />
        </>
      )}
      <WhyChooseUs />
      {isGoogleReviewsWidgetConfigured ? <GoogleReviews /> : <Testimonials />}
    </>
  )
}
