import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { heroContent } from '@/data/home'
import { ROUTES } from '@/constants/ROUTES'

export function HeroSection() {
  return (
    <section className="relative flex min-h-[85vh] items-center">
      <img
        src={heroContent.imageUrl}
        alt="Andhra cuisine spread with biryani and curries"
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/30" />

      <Container as="div" className="relative z-10 py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">
            Welcome to Taste of Andhra
          </p>
          <h1 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
            {heroContent.headline}
          </h1>
          <p className="mt-6 text-base leading-relaxed text-white/85 md:text-lg">
            {heroContent.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link to={ROUTES.MENU}>
              <Button size="lg" className="w-full sm:w-auto">
                View Menu
              </Button>
            </Link>
            <Link to={ROUTES.MENU}>
              <Button
                size="lg"
                variant="secondary"
                className="w-full border-white bg-white/10 text-white hover:bg-white/20 sm:w-auto"
              >
                Order Now
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  )
}
