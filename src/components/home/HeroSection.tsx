import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { LazyImage } from '@/components/ui/LazyImage'
import { useOrganization } from '@/contexts/OrganizationContext'
import { ROUTES } from '@/constants/ROUTES'
import { storefrontHero, isSpiceMalabarStorefront } from '@/utils/storefrontCopy'

export function HeroSection() {
  const org = useOrganization()
  const hero = storefrontHero(org)
  const isSpiceMalabar = isSpiceMalabarStorefront(org)

  if (isSpiceMalabar) {
    return (
      <section className="border-b border-gray-100 bg-white">
        <Container as="div" className="py-10 md:py-14">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-heading text-3xl font-bold leading-tight text-text-primary md:text-4xl lg:text-5xl">
              Kerala · South Indian · North Indian · Indo-Chinese
            </h1>
            <p className="mt-4 text-base leading-relaxed text-text-secondary md:text-lg">
              Authentic favorites from Chopstick Spice Malabar, freshly prepared for dine-in, pickup, and delivery.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link to={ROUTES.ONAM}>
                <Button size="lg" className="w-full sm:w-auto">
                  Pre-book Onam Sadhya
                </Button>
              </Link>
              <Link to={ROUTES.MENU}>
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  View Menu
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section className="relative flex min-h-[85vh] items-center">
      <LazyImage
        src={hero.imageUrl}
        alt={hero.imageAlt}
        eager
        imageWidth={1400}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/30" />

      <Container as="div" className="relative z-10 py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex max-w-full items-center rounded-full border border-accent/60 bg-gradient-to-r from-accent/30 via-accent/15 to-white/5 px-5 py-2.5 font-heading text-xl font-extrabold uppercase tracking-[0.12em] text-primary shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm md:text-2xl md:tracking-[0.16em] lg:text-3xl">
            {hero.kicker}
          </p>
          <h1 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
            {hero.headline}
          </h1>
          <p className="mt-6 text-base leading-relaxed text-white/85 md:text-lg">
            {hero.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link to={ROUTES.MENU}>
              <Button size="lg" className="w-full sm:w-auto">
                View Menu
              </Button>
            </Link>
            <Link to={ROUTES.LIGHT_MENU}>
              <Button
                size="lg"
                variant="secondary"
                className="w-full border-white bg-white/10 text-white hover:bg-white/20 sm:w-auto"
              >
                Quick Order
              </Button>
            </Link>
          </div>
          <p className="mt-4">
            <Link
              to={ROUTES.LIGHT_MENU}
              className="text-sm font-medium text-white/80 underline underline-offset-4 transition-colors hover:text-white"
            >
              Prefer a lighter menu? Browse without photos
            </Link>
          </p>
        </div>
      </Container>
    </section>
  )
}
