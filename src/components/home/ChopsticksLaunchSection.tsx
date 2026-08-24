import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { WhatsAppGlyph } from '@/components/ui/WhatsAppLink'
import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import { ROUTES } from '@/constants/ROUTES'
import { useStorefrontWhatsApp } from '@/hooks/useStorefrontWhatsApp'
import { formatPrice } from '@/utils/format'

/**
 * Chopsticks-only band: makes the website launch obvious and drives Onam booking.
 */
export function ChopsticksLaunchSection() {
  const whatsApp = useStorefrontWhatsApp()
  const host =
    typeof window !== 'undefined' && window.location.host
      ? window.location.host
      : 'chopsticksspicemalabar.directapp.in'
  const dineIn = ONAM_SADHYA.services.dine_in.price
  const parcel = ONAM_SADHYA.services.parcel.price

  return (
    <section className="border-y border-[#d4c4a8]/70 bg-[#f7f1e3] py-10 md:py-14">
      <Container as="div" className="mx-auto max-w-2xl text-center">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-[#5c4a2a] motion-safe:animate-[onam-fade-up_0.65s_ease-out_both]">
          {ONAM_SADHYA.launchBadge}
        </p>
        <h2 className="mt-3 font-heading text-2xl font-bold text-[#13261c] motion-safe:animate-[onam-fade-up_0.7s_ease-out_0.05s_both] sm:text-3xl">
          Welcome — this is where you book Onam
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#3d3220]/85 motion-safe:animate-[onam-fade-up_0.7s_ease-out_0.1s_both] sm:text-base">
          25 &amp; 26 August · Dine-in {formatPrice(dineIn)} · Parcel{' '}
          {formatPrice(parcel)}. Tap below to pre-book, or chat with us if you
          have questions.
        </p>

        <a
          href={typeof window !== 'undefined' ? window.location.origin : `https://${host}`}
          className="mt-5 inline-block font-medium text-[#13261c] underline decoration-[#c4a574] underline-offset-4 transition-colors hover:text-primary motion-safe:animate-[onam-fade-up_0.7s_ease-out_0.12s_both]"
        >
          {host}
        </a>

        <div className="mt-7 flex flex-col items-stretch justify-center gap-3 motion-safe:animate-[onam-fade-up_0.75s_ease-out_0.15s_both] sm:flex-row sm:items-center">
          <Link to={ROUTES.ONAM} className="inline-flex w-full sm:w-auto">
            <Button size="lg" className="h-auto min-h-12 w-full py-2.5 sm:w-auto">
              {ONAM_SADHYA.launchCtaPrimary}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
          <Link to={ROUTES.MENU} className="inline-flex w-full sm:w-auto">
            <Button
              size="lg"
              variant="secondary"
              className="h-auto min-h-12 w-full py-2.5 sm:w-auto"
            >
              View Menu
            </Button>
          </Link>
          {whatsApp.orderUrl ? (
            <a
              href={whatsApp.orderUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border-2 border-[#13261c] bg-transparent px-8 py-2.5 text-base font-medium text-[#13261c] transition-colors hover:bg-[#13261c]/5 sm:w-auto"
            >
              <WhatsAppGlyph className="h-5 w-5 text-[#128C7E]" />
              {ONAM_SADHYA.launchCtaWhatsApp}
            </a>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
