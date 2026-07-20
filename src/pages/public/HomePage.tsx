import { FeaturedCategories } from '@/components/home/FeaturedCategories'
import { FeaturedDishes } from '@/components/home/FeaturedDishes'
import { HeroSection } from '@/components/home/HeroSection'
import { Testimonials } from '@/components/home/Testimonials'
import { WhyChooseUs } from '@/components/home/WhyChooseUs'
import { featuredDishes } from '@/data/home'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedCategories />
      <FeaturedDishes dishes={featuredDishes} />
      <WhyChooseUs />
      <Testimonials />
    </>
  )
}
