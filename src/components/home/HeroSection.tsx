import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { LazyImage } from '@/components/ui/LazyImage'
import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import { useOrganization } from '@/contexts/OrganizationContext'
import { ROUTES } from '@/constants/ROUTES'
import {
  storefrontHero,
  isSpiceMalabarStorefront,
} from '@/utils/storefrontCopy'
import { formatPrice } from '@/utils/format'
import { buildWhatsAppDeepLink } from '@/utils/websiteStarter'

function BilingualCtaLabel({
  english,
  malayalam,
  detail,
}: {
  english: string
  malayalam: string
  detail?: string
}) {
  return (
    <span className="flex flex-col items-center leading-tight">
      <span>{english}</span>
      <span className="mt-0.5 text-[0.8em] font-normal opacity-90">
        {malayalam}
      </span>
      {detail ? (
        <span className="mt-0.5 text-[0.72em] font-normal opacity-80">
          {detail}
        </span>
      ) : null}
    </span>
  )
}

export function HeroSection() {
  const org = useOrganization()
  const hero = storefrontHero(org)
  const isSpiceMalabar = isSpiceMalabarStorefront(org)

  if (isSpiceMalabar) {
    const dineIn = ONAM_SADHYA.services.dine_in.price
    const parcel = ONAM_SADHYA.services.parcel.price
    const whatsappHref = buildWhatsAppDeepLink(
      ONAM_SADHYA.enquiryWhatsAppPhone,
      ONAM_SADHYA.enquiryWhatsAppMessage,
    )

    return (
      <section className="bg-[#f3ead8]">
        {/* Full poster — contain so food, title, and Mahabali stay visible */}
        <div className="mx-auto flex max-w-[1280px] items-center justify-center px-3 pt-4 sm:px-6 sm:pt-6 lg:px-8">
          <LazyImage
            src={ONAM_SADHYA.imageUrl}
            alt={`${ONAM_SADHYA.title} — ${ONAM_SADHYA.headline}`}
            eager
            imageWidth={1600}
            className="h-auto max-h-[min(68svh,720px)] w-auto max-w-full rounded-sm object-contain shadow-[0_12px_40px_rgba(40,28,12,0.18)] motion-safe:animate-[onam-fade-up_0.7s_ease-out_both]"
          />
        </div>

        <div className="mt-4 border-t border-[#d4c4a8]/80 bg-[#13261c] sm:mt-6">
          <Container className="flex flex-col items-stretch gap-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-6">
            <div className="motion-safe:animate-[onam-fade-up_0.75s_ease-out_0.1s_both]">
              <p className="font-heading text-lg font-semibold text-[#e8d5a3] sm:text-xl">
                Pre-book {ONAM_SADHYA.title}
              </p>
              <p className="mt-0.5 text-sm text-[#e8d5a3]/85">
                ഓണം സദ്യ പ്രീ-ബുക്ക് ചെയ്യുക
              </p>
              <p className="mt-1 text-sm text-white/80 sm:text-base">
                25 &amp; 26 August · Dine-in {formatPrice(dineIn)} · Parcel{' '}
                {formatPrice(parcel)}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 motion-safe:animate-[onam-fade-up_0.75s_ease-out_0.15s_both] sm:w-auto sm:flex-row sm:items-stretch">
              <Link to={ROUTES.ONAM} className="inline-flex w-full sm:w-auto">
                <Button
                  size="lg"
                  className="h-auto min-h-12 w-full py-2.5 sm:w-auto"
                >
                  <BilingualCtaLabel
                    english="Pre-book Onam Sadhya"
                    malayalam="ഓണം സദ്യ പ്രീ-ബുക്ക് ചെയ്യുക"
                  />
                </Button>
              </Link>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full sm:w-auto"
                >
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-auto min-h-12 w-full border-[#e8d5a3] bg-transparent py-2.5 text-[#e8d5a3] hover:bg-[#e8d5a3]/10 sm:w-auto"
                  >
                    <BilingualCtaLabel
                      english="Chat on WhatsApp"
                      malayalam="വാട്ട്‌സ്ആപ്പിൽ ചോദിക്കുക"
                      detail="+91 89289 45888"
                    />
                  </Button>
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
