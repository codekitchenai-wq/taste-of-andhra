import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { LazyImage } from '@/components/ui/LazyImage'
import { useOrganization } from '@/contexts/OrganizationContext'
import { ROUTES } from '@/constants/ROUTES'
import { storefrontHero, isSpiceMalabarStorefront } from '@/utils/storefrontCopy'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import { useStorefrontWhatsApp } from '@/hooks/useStorefrontWhatsApp'

export function HeroSection() {
  const org = useOrganization()
  const hero = storefrontHero(org)
  const { enabled: showWhatsApp, orderUrl: whatsAppHref } = useStorefrontWhatsApp()

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
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">
            {hero.kicker}
          </p>
          <h1 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
            {hero.headline}
          </h1>
          <p className="mt-6 text-base leading-relaxed text-white/85 md:text-lg">
            {hero.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            {isSpiceMalabarStorefront(org) ? (
              <Link to={ROUTES.ONAM}>
                <Button size="lg" className="w-full sm:w-auto">
                  Pre-book Onam Sadhya
                </Button>
              </Link>
            ) : (
              <Link to={ROUTES.MENU}>
                <Button size="lg" className="w-full sm:w-auto">
                  View Menu
                </Button>
              </Link>
            )}
            <Link to={isSpiceMalabarStorefront(org) ? ROUTES.MENU : ROUTES.LIGHT_MENU}>
              <Button
                size="lg"
                variant="secondary"
                className="w-full border-white bg-white/10 text-white hover:bg-white/20 sm:w-auto"
              >
                {isSpiceMalabarStorefront(org) ? 'View Menu' : 'Quick Order'}
              </Button>
            </Link>
            {showWhatsApp && whatsAppHref ? (
              <WhatsAppLink
                href={whatsAppHref}
                variant="button"
                className="w-full bg-[#25D366] hover:bg-[#1ebe57] sm:w-auto"
              >
                Order on WhatsApp
              </WhatsAppLink>
            ) : null}
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
