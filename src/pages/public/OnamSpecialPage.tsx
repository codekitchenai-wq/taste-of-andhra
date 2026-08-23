import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  Leaf,
  Minus,
  Plus,
  Share2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { OnamDeliveryAddress } from '@/components/checkout/OnamDeliveryAddress'
import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import { AUTH_REDIRECT_STORAGE_KEY } from '@/constants/AUTH'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useAddresses } from '@/hooks/useAddresses'
import { useOrganization } from '@/contexts/OrganizationContext'
import { whatsappShareUrl } from '@/services/paymentShareService'
import { formatPrice } from '@/utils/format'
import { normalizeIndianPhone } from '@/utils/phone'
import {
  clampOnamPlates,
  defaultOnamPrebook,
  onamDateLabel,
  onamTimeSlots,
  readOnamPrebook,
  writeOnamPrebook,
  type OnamPrebook,
} from '@/utils/onamPrebook'
import { writeCheckoutAddressId } from '@/utils/checkoutAddress'
import { formatAddressLine } from '@/utils/mapAddress'
import { isSpiceMalabarStorefront } from '@/utils/storefrontCopy'
import * as deliveryQuoteService from '@/services/deliveryQuoteService'
import * as dishService from '@/services/dishService'
import * as orderService from '@/services/orderService'
import {
  clearOnamPrebook,
  onamOrderNote,
  onamScheduledAt,
} from '@/utils/onamPrebook'

export default function OnamSpecialPage() {
  const org = useOrganization()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth()
  const { isUpdating, addItem, clearCart } = useCart()
  const { addresses, isLoading: addressesLoading, refetch: refetchAddresses } =
    useAddresses()
  const [prebook, setPrebook] = useState<OnamPrebook>(defaultOnamPrebook)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  )
  const [requestAddAddress, setRequestAddAddress] = useState(0)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const promptedCheckoutRef = useRef(false)

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
    if (saved) setPrebook({ ...saved, service: 'parcel' })
  }, [])

  const selectedAddress =
    addresses.find((address) => address.id === selectedAddressId) ?? null

  const buildOnamWhatsAppMessage = (
    booking: OnamPrebook,
    orderNumber: string,
  ) => {
    const offer = ONAM_SADHYA.services[booking.service]
    const customerName =
      selectedAddress?.full_name ||
      user?.full_name ||
      'Customer'
    const customerPhone =
      selectedAddress?.phone?.trim() ||
      user?.phone?.trim() ||
      ''
    const lines = [
      `Hi ${ONAM_SADHYA.restaurant}!`,
      `New Onam Sadhya order from ${customerName}.`,
      '',
      `Order number: ${orderNumber}`,
      '',
      'Order details:',
      `• ${offer.label}`,
      `• ${booking.plates} plate${booking.plates === 1 ? '' : 's'}`,
      `• Date: ${onamDateLabel(booking.date)}`,
      `• Slot: ${slots.find((slot) => slot.value === booking.slot)?.label ?? booking.slot}`,
      `• Amount: ${formatPrice(subtotal)} + tax`,
      `• Delivery: ${selectedAddress ? formatAddressLine(selectedAddress) : ''}`,
    ]
    if (customerPhone) {
      lines.push(`• Customer phone: ${customerPhone}`)
    }
    if (booking.comments.trim()) {
      lines.push(`• Comments: ${booking.comments.trim()}`)
    }
    lines.push('', 'Please confirm. Customer will complete UPI on the next screen.')
    return lines.join('\n')
  }

  const placeOnamWhatsAppOrder = async (fromForm = false) => {
    const booking = fromForm ? prebook : (readOnamPrebook() ?? prebook)
    writeOnamPrebook(booking)

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

    if (!selectedAddressId) {
      setRequestAddAddress((current) => current + 1)
      toast.error('Add a delivery address to continue')
      return
    }

    if (!selectedAddress) {
      toast.error('Select a delivery address to continue')
      return
    }

    writeCheckoutAddressId(selectedAddressId)

    const restaurantWhatsApp =
      normalizeIndianPhone(ONAM_SADHYA.enquiryWhatsAppPhone) ?? '8928945888'

    setIsPlacingOrder(true)

    try {
      const dishResult = await dishService.getDishBySlug(service.dishSlug)
      if (!dishResult.success) {
        toast.error(
          dishResult.message === 'Dish not found.'
            ? 'Onam menu is not set up yet for this restaurant. Please try again shortly or contact the restaurant.'
            : dishResult.message,
        )
        return
      }

      const clearResult = await clearCart()
      if (!clearResult.success) {
        toast.error(clearResult.message)
        return
      }

      const addResult = await addItem(dishResult.data.id, booking.plates)
      if (!addResult.success) {
        toast.error(addResult.message)
        return
      }

      const lineSubtotal = service.price * booking.plates
      const quoteResult = await deliveryQuoteService.getDeliveryQuote({
        address: selectedAddress,
        subtotal: lineSubtotal,
        itemCount: booking.plates,
        allowOutsideServiceArea: isSpiceMalabarStorefront(org),
      })

      if (!quoteResult.success) {
        toast.error(quoteResult.message)
        return
      }

      const orderResult = await orderService.createOrder({
        addressId: selectedAddressId,
        paymentMethod: 'pay_later',
        specialInstructions: onamOrderNote(booking),
        deliveryQuoteId: quoteResult.data.isServiceable
          ? (quoteResult.data.quoteId ?? null)
          : null,
        scheduledFor: onamScheduledAt(booking.date, booking.slot),
        whatsappUpdatesOptIn: org.storefrontWhatsAppEnabled,
      })

      if (!orderResult.success) {
        toast.error(orderResult.message)
        return
      }

      const message = buildOnamWhatsAppMessage(
        booking,
        orderResult.data.order_number,
      )
      window.open(
        whatsappShareUrl(restaurantWhatsApp, message),
        '_blank',
        'noopener,noreferrer',
      )

      clearOnamPrebook()
      navigate(ROUTES.ORDER_SUCCESS, {
        state: {
          orderId: orderResult.data.id,
          orderNumber: orderResult.data.order_number,
          paymentMethod: orderResult.data.payment_method,
          paymentShareToken: orderResult.data.payment_share_token ?? null,
        },
      })
    } finally {
      setIsPlacingOrder(false)
    }
  }

  useEffect(() => {
    if (!shouldCheckout || isAuthLoading || !isAuthenticated) return
    if (promptedCheckoutRef.current) return
    promptedCheckoutRef.current = true
    toast('Confirm your delivery address, then place the order')
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
    <div className="min-h-[calc(100svh-72px)] bg-[#f4f0e8]">
      <Container as="div" className="py-4 md:py-6 lg:py-7">
        <section className="rounded-xl border border-[#e4d9c4] bg-surface p-4 shadow-[0_8px_30px_rgba(40,28,12,0.06)] md:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary md:text-xs">
            {ONAM_SADHYA.restaurant}
          </p>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-text-secondary md:text-sm">
            {ONAM_SADHYA.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-text-primary">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              25 &amp; 26 August
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              <Leaf className="h-3.5 w-3.5" />
              Vegetarian sadhya
            </span>
          </div>
        </section>

        <div className="mt-4 grid gap-4 md:mt-5 md:gap-5 lg:grid-cols-2 lg:items-stretch">
          <aside className="order-1 flex h-full flex-col overflow-hidden rounded-xl border border-[#e4d9c4] bg-surface shadow-[0_8px_30px_rgba(40,28,12,0.06)] lg:order-2">
            <div className="border-b border-[#efe6d6] bg-gradient-to-br from-primary/[0.08] via-surface to-surface px-4 py-3 md:px-5">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h1 className="font-heading text-xl font-bold tracking-tight text-text-primary md:text-[1.35rem]">
                    Pre-book now
                  </h1>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Parcel / delivery · prices per plate + tax
                  </p>
                </div>
                <p className="font-heading text-xl font-bold text-primary md:text-[1.35rem]">
                  {formatPrice(service.price)}
                  <span className="ml-1 font-body text-[11px] font-medium text-text-secondary">
                    / plate
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 px-4 py-4 md:gap-3.5 md:px-5 md:py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  compact
                  label="Celebration date"
                  value={prebook.date}
                  onChange={(event) => update({ date: event.target.value })}
                  options={ONAM_SADHYA.dates.map((date) => ({
                    value: date.value,
                    label: date.label,
                  }))}
                />
                <div>
                  <p className="mb-0.5 text-xs font-medium text-text-primary">
                    Pickup / delivery date
                  </p>
                  <div className="flex h-9 items-center rounded-[var(--radius-input)] border border-gray-200 bg-background/80 px-2.5 text-xs text-text-primary md:text-sm">
                    {onamDateLabel(prebook.date)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  compact
                  label="Time slot"
                  value={prebook.slot}
                  onChange={(event) => update({ slot: event.target.value })}
                  options={slots.map((slot) => ({
                    value: slot.value,
                    label: slot.label,
                  }))}
                />
                <div>
                  <p className="mb-0.5 text-xs font-medium text-text-primary">
                    Number of plates
                  </p>
                  <div className="flex h-9 items-center justify-between rounded-[var(--radius-input)] border border-gray-300 bg-background/60 px-1">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center text-text-secondary transition-colors hover:text-primary"
                      aria-label="Fewer plates"
                      disabled={prebook.plates <= ONAM_SADHYA.minPlates}
                      onClick={() =>
                        update({ plates: clampOnamPlates(prebook.plates - 1) })
                      }
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
                      {prebook.plates}
                    </span>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center text-text-secondary transition-colors hover:text-primary"
                      aria-label="More plates"
                      disabled={prebook.plates >= ONAM_SADHYA.maxPlates}
                      onClick={() =>
                        update({ plates: clampOnamPlates(prebook.plates + 1) })
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <Textarea
                compact
                label="Additional comments (optional)"
                rows={2}
                placeholder="Gate code, allergies, spice preference…"
                value={prebook.comments}
                onChange={(event) => update({ comments: event.target.value })}
                className="min-h-[56px] resize-y text-xs md:text-sm"
              />

              {isAuthenticated ? (
                <OnamDeliveryAddress
                  addresses={addresses}
                  isLoading={addressesLoading}
                  onRefetch={refetchAddresses}
                  selectedAddressId={selectedAddressId}
                  onSelect={setSelectedAddressId}
                  requestAddAddress={requestAddAddress}
                />
              ) : !isAuthLoading ? (
                <p className="rounded-[var(--radius-button)] bg-background px-3 py-2 text-xs leading-relaxed text-text-secondary md:text-sm">
                  Sign in to confirm delivery address, then place your order.
                </p>
              ) : null}

              <div className="mt-auto space-y-2.5 pt-1">
                <div className="flex items-center justify-between rounded-[var(--radius-button)] bg-[#f7f1e3] px-3 py-2 text-xs md:text-sm">
                  <span className="text-text-secondary">
                    {prebook.plates} × {formatPrice(service.price)}
                  </span>
                  <span className="font-semibold text-text-primary">
                    {formatPrice(subtotal)} + tax
                  </span>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  size="md"
                  disabled={
                    isUpdating ||
                    isPlacingOrder ||
                    (isAuthenticated && addressesLoading)
                  }
                  onClick={() => void placeOnamWhatsAppOrder(true)}
                >
                  {isPlacingOrder
                    ? 'Placing order…'
                    : isUpdating
                      ? 'Preparing details…'
                      : isAuthenticated && addressesLoading
                        ? 'Loading address…'
                        : 'Send order on WhatsApp'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  size="sm"
                  onClick={() => void sharePage()}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share this offer
                </Button>
                <p className="text-center text-[11px] leading-relaxed text-text-secondary">
                  Opens WhatsApp with your order, then UPI payment on the next
                  screen.
                </p>
              </div>
            </div>
          </aside>

          <section className="order-2 flex h-full flex-col overflow-hidden rounded-xl border border-[#e4d9c4] bg-surface shadow-[0_8px_30px_rgba(40,28,12,0.06)] lg:order-1">
            <div className="border-b border-[#efe6d6] px-4 py-3 md:px-5">
              <h2 className="font-heading text-xl font-bold tracking-tight text-text-primary md:text-[1.35rem]">
                Onam Sadhya includes
              </h2>
              <p className="mt-0.5 text-xs text-text-secondary">
                28 traditional items served on banana leaf
              </p>
            </div>

            <ul className="grid flex-1 grid-cols-2 content-start gap-1.5 p-3 sm:gap-2 sm:p-4 lg:grid-cols-2 xl:grid-cols-3">
              {ONAM_SADHYA.includes.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-1.5 rounded-lg bg-[#f7f1e3]/80 px-2 py-1.5 text-[11px] text-text-primary md:text-xs"
                >
                  <Leaf
                    className="mt-0.5 h-3 w-3 shrink-0 text-success"
                    aria-hidden
                  />
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Container>
    </div>
  )
}
