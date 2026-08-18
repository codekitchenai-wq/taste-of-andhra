import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { LazyImage } from '@/components/ui/LazyImage'
import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import { ROUTES } from '@/constants/ROUTES'
import { useOrganization } from '@/contexts/OrganizationContext'
import { isSpiceMalabarStorefront } from '@/utils/storefrontCopy'
import { useStorefrontWhatsApp } from '@/hooks/useStorefrontWhatsApp'

export function OnamSpecialBanner() {
  const org = useOrganization()
  const whatsApp = useStorefrontWhatsApp()
  if (!isSpiceMalabarStorefront(org)) return null

  return (
    <section className="bg-[#f7f1e3] py-8 md:py-12">
      <Container as="div">
        <Link
          to={ROUTES.ONAM}
          className="group grid overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-md transition-shadow hover:shadow-lg md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
        >
          <div className="relative min-h-48">
            <LazyImage
              src={ONAM_SADHYA.imageUrl}
              alt="Onam Sadhya"
              imageWidth={900}
              className="h-full w-full object-cover"
            />
            <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-text-primary">
              {ONAM_SADHYA.kicker}
            </span>
          </div>
          <div className="flex flex-col justify-center p-6 md:p-8">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              25 & 26 August · {ONAM_SADHYA.hoursLabel}
            </p>
            <h2 className="mt-2 font-heading text-2xl font-bold md:text-3xl">
              {ONAM_SADHYA.title}
            </h2>
            <p className="mt-2 text-sm text-text-secondary md:text-base">
              Pre-book plates and a delivery slot, then{' '}
              {whatsApp.enabled
                ? 'WhatsApp the kitchen or place the order online.'
                : 'place the order online.'}
            </p>
            <div className="mt-5">
              <Button type="button" className="pointer-events-none">
                Pre-book now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          </div>
        </Link>
      </Container>
    </section>
  )
}
