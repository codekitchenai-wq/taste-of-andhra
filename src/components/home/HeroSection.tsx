import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { LazyImage } from '@/components/ui/LazyImage'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppLink'
import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import { useOrganization } from '@/contexts/OrganizationContext'
import { ROUTES } from '@/constants/ROUTES'
import { useStorefrontWhatsApp } from '@/hooks/useStorefrontWhatsApp'
import {
  storefrontHero,
  isSpiceMalabarStorefront,
} from '@/utils/storefrontCopy'
import { formatPrice } from '@/utils/format'

export function HeroSection() {
  const org = useOrganization()
  const hero = storefrontHero(org)
  const isSpiceMalabar = isSpiceMalabarStorefront(org)
  const whatsApp = useStorefrontWhatsApp()

  if (isSpiceMalabar) {
    const dineIn = ONAM_SADHYA.services.dine_in.price
    const parcel = ONAM_SADHYA.services.parcel.price

    return (
      <section className="bg-[#f3ead8]">
        <Link
          to={ROUTES.ONAM}
          className="block bg-[#13261c] px-4 py-2.5 text-center transition-colors hover:bg-[#1a3226] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#e8d5a3]"
        >
          <span className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-[#e8d5a3] sm:text-sm">
            {ONAM_SADHYA.launchBadge}
          </span>
          <span className="mx-2 text-white/40" aria-hidden>
            ·
          </span>
          <span className="text-xs text-white/90 sm:text-sm">
            Pre-book {ONAM_SADHYA.title} for 25 &amp; 26 August →
          </span>
        </Link>

        <Container className="pt-6 text-center sm:pt-8">
          <p className="font-heading text-2xl font-bold tracking-tight text-[#13261c] motion-safe:animate-[onam-fade-up_0.65s_ease-out_both] sm:text-3xl md:text-4xl">
            {ONAM_SADHYA.restaurant}
          </p>
          <h1 className="mt-3 font-heading text-xl font-semibold text-[#3d3220] motion-safe:animate-[onam-fade-up_0.7s_ease-out_0.05s_both] sm:text-2xl md:text-3xl">
            {ONAM_SADHYA.launchHeadline}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#3d3220]/80 motion-safe:animate-[onam-fade-up_0.7s_ease-out_0.1s_both] sm:text-base">
            {ONAM_SADHYA.launchSupport}
          </p>
        </Container>

        {/* Full poster — tap opens Onam pre-book */}
        <div className="mx-auto flex max-w-[1280px] items-center justify-center px-3 pt-5 sm:px-6 sm:pt-6 lg:px-8">
          <Link
            to={ROUTES.ONAM}
            className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#13261c]"
            aria-label={`Pre-book ${ONAM_SADHYA.title}`}
          >
            <LazyImage
              src={ONAM_SADHYA.imageUrl}
              alt={`${ONAM_SADHYA.title} — ${ONAM_SADHYA.headline}`}
              eager
              imageWidth={1600}
              className="h-auto max-h-[min(58svh,640px)] w-auto max-w-full rounded-sm object-contain shadow-[0_12px_40px_rgba(40,28,12,0.18)] transition-transform duration-500 motion-safe:animate-[onam-fade-up_0.7s_ease-out_0.12s_both] motion-safe:group-hover:scale-[1.015]"
            />
          </Link>
        </div>

        <div className="mt-4 border-t border-[#d4c4a8]/80 bg-[#13261c] sm:mt-6">
          <Container className="flex flex-col items-stretch gap-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-6">
            <div className="motion-safe:animate-[onam-fade-up_0.75s_ease-out_0.1s_both]">
              <p className="font-heading text-lg font-semibold text-[#e8d5a3] sm:text-xl">
                Pre-book {ONAM_SADHYA.title}
              </p>
              <p className="mt-1 text-sm text-white/80 sm:text-base">
                25 &amp; 26 August · Dine-in {formatPrice(dineIn)} · Parcel{' '}
                {formatPrice(parcel)}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 motion-safe:animate-[onam-fade-up_0.75s_ease-out_0.15s_both] sm:w-auto sm:flex-row sm:items-center">
              <Link
                to={ROUTES.ONAM}
                className="inline-flex w-full shrink-0 sm:w-auto"
              >
                <Button
                  size="lg"
                  className="h-auto min-h-12 w-full py-2.5 sm:w-auto"
                >
                  <span className="flex flex-col items-center leading-tight">
                    <span>{ONAM_SADHYA.launchCtaPrimary}</span>
                    <span className="mt-0.5 text-[0.8em] font-normal opacity-90">
                      {ONAM_SADHYA.launchCtaPrimaryMl}
                    </span>
                  </span>
                </Button>
              </Link>
              {whatsApp.orderUrl ? (
                <a
                  href={whatsApp.orderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-auto min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[#e8d5a3]/50 bg-transparent px-5 py-2.5 text-sm font-medium text-[#e8d5a3] transition-colors hover:border-[#e8d5a3] hover:bg-white/5 sm:w-auto"
                >
                  <WhatsAppGlyph className="h-5 w-5" />
                  {ONAM_SADHYA.launchCtaWhatsApp}
                </a>
              ) : null}
            </div>
          </Container>
        </div>
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
