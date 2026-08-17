import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  Clock,
  Leaf,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Input } from '@/components/ui/Input'
import { LazyImage } from '@/components/ui/LazyImage'
import { Select } from '@/components/ui/Select'
import { ONAM_SADHYA, type OnamServiceId } from '@/constants/ONAM_SADHYA'
import { AUTH_REDIRECT_STORAGE_KEY } from '@/constants/AUTH'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useOrganization } from '@/contexts/OrganizationContext'
import * as dishService from '@/services/dishService'
import { cn } from '@/utils/cn'
import { formatPrice } from '@/utils/format'
import {
  clampOnamPlates,
  defaultOnamPrebook,
  onamDateLabel,
  onamTimeSlots,
  onamWhatsAppUrl,
  readOnamPrebook,
  writeOnamPrebook,
  type OnamPrebook,
} from '@/utils/onamPrebook'
import { isSpiceMalabarStorefront } from '@/utils/storefrontCopy'

export default function OnamSpecialPage() {
  const org = useOrganization()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { addItem, isUpdating } = useCart()
  const [prebook, setPrebook] = useState<OnamPrebook>(defaultOnamPrebook)
  const [isPlacing, setIsPlacing] = useState(false)
  const autoCheckoutRef = useRef(false)

  const slots = useMemo(() => onamTimeSlots(), [])
  const service = ONAM_SADHYA.services[prebook.service]
  const subtotal = service.price * prebook.plates
  const shouldCheckout = searchParams.get('checkout') === '1'
  const showOffer = org.isLoading || isSpiceMalabarStorefront(org)

  useEffect(() => {
    if (org.isLoading || showOffer) return
    navigate(ROUTES.HOME, { replace: true })
  }, [navigate, org.isLoading, showOffer])

  const update = (patch: Partial<OnamPrebook>) => {
    setPrebook((current) => ({ ...current, ...patch }))
  }

  useEffect(() => {
    const saved = readOnamPrebook()
    if (saved) setPrebook(saved)
  }, [])

  const placeOnlineOrder = async (fromForm = false) => {
    const booking = fromForm ? prebook : (readOnamPrebook() ?? prebook)
    writeOnamPrebook(booking)
    const offer = ONAM_SADHYA.services[booking.service]

    if (!isAuthenticated) {
      const next = `${ROUTES.ONAM}?checkout=1`
      try {
        sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, next)
      } catch {
        // ignore
      }
      toast('Sign in to place the Onam order')
      navigate(ROUTES.LOGIN, { state: { from: next } })
      return
    }

    setIsPlacing(true)
    const dishResult = await dishService.getDishBySlug(offer.dishSlug)
    if (!dishResult.success) {
      setIsPlacing(false)
      toast.error(
        'Online ordering for this offer is not ready yet. Message the restaurant to pre-book.',
      )
      return
    }

    const cartResult = await addItem(dishResult.data.id, booking.plates)
    setIsPlacing(false)

    if (!cartResult.success) {
      toast.error(cartResult.message)
      return
    }

    toast.success(
      `${booking.plates}× Onam Sadhya added for ${onamDateLabel(booking.date)}`,
    )
    navigate(ROUTES.CHECKOUT)
  }

  useEffect(() => {
    if (!shouldCheckout || isAuthLoading || !isAuthenticated || isPlacing) {
      return
    }
    if (autoCheckoutRef.current) return
    autoCheckoutRef.current = true
    void placeOnlineOrder()
    // Auto-run once after login returns to this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldCheckout, isAuthLoading, isAuthenticated])

  const sharePage = async () => {
    const url = window.location.origin + ROUTES.ONAM
    const payload = {
      title: `${ONAM_SADHYA.kicker} · ${ONAM_SADHYA.restaurant}`,
      text: ONAM_SADHYA.headline,
      url,
    }

    try {
      if (navigator.share) {
        await navigator.share(payload)
        return
      }
    } catch {
      // User cancelled, or share is unavailable — copy instead.
    }

    try {
      await navigator.clipboard.writeText(url)
      toast.success('Offer link copied')
    } catch {
      toast.error('Unable to copy the offer link')
    }
  }

  if (!showOffer) return null

  return (
    <div className="bg-[#f7f1e3]">
      <div className="relative overflow-hidden">
        <LazyImage
          src={ONAM_SADHYA.imageUrl}
          alt="Traditional Kerala Onam Sadhya on a banana leaf"
          eager
          imageWidth={1400}
          className="h-[42vh] w-full object-cover object-center md:h-[52vh]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <Container as="div" className="absolute inset-x-0 bottom-0 pb-8 pt-16">
          <Badge className="bg-accent text-text-primary">
            {ONAM_SADHYA.kicker}
          </Badge>
          <h1 className="mt-3 font-heading text-3xl font-bold text-white md:text-5xl">
            {ONAM_SADHYA.title}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/90 md:text-base">
            {ONAM_SADHYA.headline}
          </p>
        </Container>
      </div>

      <Container as="div" className="py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          <section className="space-y-6">
            <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-sm md:p-6">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                {ONAM_SADHYA.restaurant}
              </p>
              <p className="mt-2 text-text-secondary">
                {ONAM_SADHYA.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-text-primary">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  25 & 26 August
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                  <Clock className="h-4 w-4 text-primary" />
                  {ONAM_SADHYA.hoursLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-success">
                  <Leaf className="h-4 w-4" />
                  Vegetarian sadhya
                </span>
              </div>
            </div>

            <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-sm md:p-6">
              <h2 className="font-heading text-xl font-semibold">
                Onam Sadhya includes
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                28 traditional items served on banana leaf.
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-text-primary sm:grid-cols-3">
                {ONAM_SADHYA.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <aside className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md md:sticky md:top-24 md:p-6">
            <h2 className="font-heading text-xl font-semibold">Pre-book now</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Prices are per plate, plus tax.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {(
                Object.values(ONAM_SADHYA.services) as Array<{
                  id: OnamServiceId
                  label: string
                  price: number
                }>
              ).map((option) => {
                const selected = prebook.service === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => update({ service: option.id })}
                    className={cn(
                      'rounded-[var(--radius-button)] border p-3 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-black/10 hover:border-primary/40',
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {option.id === 'parcel' ? (
                        <ShoppingBag className="h-4 w-4 text-primary" />
                      ) : (
                        <UtensilsCrossed className="h-4 w-4 text-primary" />
                      )}
                      {option.label}
                    </span>
                    <span className="mt-1 block text-lg font-bold text-primary">
                      {formatPrice(option.price)}
                    </span>
                    <span className="text-xs text-text-secondary">+ tax</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-5 space-y-4">
              <Select
                label="Celebration date"
                value={prebook.date}
                onChange={(event) => update({ date: event.target.value })}
                options={ONAM_SADHYA.dates.map((date) => ({
                  value: date.value,
                  label: date.label,
                }))}
              />
              <Select
                label="Time slot"
                value={prebook.slot}
                onChange={(event) => update({ slot: event.target.value })}
                options={slots.map((slot) => ({
                  value: slot.value,
                  label: slot.label,
                }))}
              />

              <div>
                <p className="mb-2 text-sm font-medium text-text-primary">
                  Number of plates
                </p>
                <div className="flex items-center justify-between rounded-[var(--radius-input)] border border-gray-300 px-2">
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center text-text-secondary hover:text-primary"
                    aria-label="Fewer plates"
                    disabled={prebook.plates <= ONAM_SADHYA.minPlates}
                    onClick={() =>
                      update({ plates: clampOnamPlates(prebook.plates - 1) })
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-10 text-center text-lg font-semibold tabular-nums">
                    {prebook.plates}
                  </span>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center text-text-secondary hover:text-primary"
                    aria-label="More plates"
                    disabled={prebook.plates >= ONAM_SADHYA.maxPlates}
                    onClick={() =>
                      update({ plates: clampOnamPlates(prebook.plates + 1) })
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Input
                label="Your name (optional)"
                autoComplete="name"
                value={prebook.customerName}
                onChange={(event) =>
                  update({ customerName: event.target.value })
                }
              />
            </div>

            <div className="mt-5 rounded-[var(--radius-button)] bg-background px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  {prebook.plates} × {formatPrice(service.price)}
                </span>
                <span className="font-semibold text-text-primary">
                  {formatPrice(subtotal)} + tax
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <a
                href={onamWhatsAppUrl(prebook)}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Button type="button" fullWidth size="lg">
                  <MessageCircle className="h-4 w-4" />
                  Message restaurant
                </Button>
              </a>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                size="lg"
                disabled={isPlacing || isUpdating}
                onClick={() => void placeOnlineOrder(true)}
              >
                {isPlacing || isUpdating
                  ? 'Adding to order…'
                  : prebook.service === 'parcel'
                    ? 'Place delivery order'
                    : 'Place dine-in order'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => void sharePage()}
              >
                <Share2 className="h-4 w-4" />
                Share this offer
              </Button>
            </div>
            <p className="mt-3 text-xs text-text-secondary">
              WhatsApp sends your plates and slot to {ONAM_SADHYA.restaurant}.
              Online orders keep the same slot as a delivery note for 25–26
              August.
            </p>
          </aside>
        </div>
      </Container>
    </div>
  )
}
