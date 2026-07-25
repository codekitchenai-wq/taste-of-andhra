import { FeaturedCategories } from '@/components/home/FeaturedCategories'
import { FeaturedDishes } from '@/components/home/FeaturedDishes'
import { GoogleReviews } from '@/components/home/GoogleReviews'
import { HeroSection } from '@/components/home/HeroSection'
import { Testimonials } from '@/components/home/Testimonials'
import { WhyChooseUs } from '@/components/home/WhyChooseUs'
import { featuredDishes } from '@/data/home'
import { isGoogleReviewsWidgetConfigured } from '@/utils/googleReviews'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedCategories />
      <FeaturedDishes dishes={featuredDishes} />
      <WhyChooseUs />
      {isGoogleReviewsWidgetConfigured ? <GoogleReviews /> : <Testimonials />}
    </>
  )
}
