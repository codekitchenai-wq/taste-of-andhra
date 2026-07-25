import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { LazyImage } from '@/components/ui/LazyImage'
import { SectionHeader } from '@/components/home/SectionHeader'
import { featuredCategories } from '@/data/home'
import { ROUTES } from '@/constants/ROUTES'

export function FeaturedCategories() {
  return (
    <section className="bg-background py-12 md:py-16 lg:py-20">
      <Container as="div">
        <SectionHeader
          title="Explore Categories"
          subtitle="Browse our menu by your favorite Andhra specialties"
        />

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {featuredCategories.map((category) => (
            <Link
              key={category.id}
              to={ROUTES.MENU}
              className="group overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <LazyImage
                  src={category.imageUrl}
                  alt={category.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-text-primary">
                  {category.name}
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  {category.dishCount} dishes
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <Link
            to={ROUTES.MENU}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-dark"
          >
            View Full Menu
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={ROUTES.LIGHT_MENU}
            className="text-xs text-text-secondary transition-colors hover:text-primary"
          >
            Light menu — text only, faster to order
          </Link>
        </div>
      </Container>
    </section>
  )
}
