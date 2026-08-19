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
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Input } from '@/components/ui/Input'
import { LazyImage } from '@/components/ui/LazyImage'
import { Select } from '@/components/ui/Select'
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
import { useStorefrontWhatsApp } from '@/hooks/useStorefrontWhatsApp'
import { storefrontWhatsAppPhone } from '@/utils/storefrontWhatsApp'

export default function OnamSpecialPage() {
  const org = useOrganization()
  const whatsApp = useStorefrontWhatsApp()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth()
  const { isUpdating } = useCart()
  const { addresses } = useAddresses()
  const [prebook, setPrebook] = useState<OnamPrebook>(defaultOnamPrebook)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  )
  const [requestAddAddress, setRequestAddAddress] = useState(0)
  const [isAddressLoading, setIsAddressLoading] = useState(false)
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false)
  const [whatsAppTargetPhone, setWhatsAppTargetPhone] = useState('')
  const [whatsAppPreviewMessage, setWhatsAppPreviewMessage] = useState('')
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

  useEffect(() => {
    const defaultPhone = storefrontWhatsAppPhone(whatsApp.contact) ?? ''
    if (!defaultPhone) return
    if (!whatsAppTargetPhone.trim()) {
      setWhatsAppTargetPhone(defaultPhone)
    }
  }, [whatsApp.contact, whatsAppTargetPhone])

  const buildOnamWhatsAppMessage = (booking: OnamPrebook) => {
    const offer = ONAM_SADHYA.services[booking.service]
    const customerName =
      booking.customerName.trim() ||
      selectedAddress?.full_name ||
      user?.full_name ||
      'Customer'
    const customerPhone = selectedAddress?.phone || user?.phone || ''
    return [
      `Hi ${whatsApp.contact.name},`,
      'I want to place an Onam Sadhya order.',
      '',
      'Order details:',
      `• ${offer.label}`,
      `• ${booking.plates} plate${booking.plates === 1 ? '' : 's'}`,
      `• Date: ${onamDateLabel(booking.date)}`,
      `• Slot: ${slots.find((slot) => slot.value === booking.slot)?.label ?? booking.slot}`,
      `• Amount: ${formatPrice(subtotal)} + tax`,
      '',
      'Customer details:',
      `• Name: ${customerName}`,
      `• Contact: ${customerPhone || '(share on call)'}`,
      `• Address: ${selectedAddress ? formatAddressLine(selectedAddress) : '(missing address)'}`,
      '',
      'Please share UPI payment link and confirm this booking.',
    ].join('\n')
  }

  const placeOnamWhatsAppOrder = (fromForm = false) => {
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
    setWhatsAppPreviewMessage(buildOnamWhatsAppMessage(booking))
    if (!whatsAppTargetPhone.trim()) {
      setWhatsAppTargetPhone(storefrontWhatsAppPhone(whatsApp.contact) ?? '')
    }
    setShowWhatsAppPreview(true)
  }

  const openWhatsAppWithPreview = () => {
    const normalized = normalizeIndianPhone(whatsAppTargetPhone)
    if (!normalized) {
      toast.error('Enter a valid 10-digit WhatsApp number')
      return
    }
    const message = whatsAppPreviewMessage.trim()
    if (!message) {
      toast.error('Order message is empty. Please try again.')
      return
    }
    const url = whatsappShareUrl(normalized, message)
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.success(`Opening WhatsApp to +91 ${normalized}`)
    setShowWhatsAppPreview(false)
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

            <div className="mt-5 rounded-[var(--radius-button)] border border-primary bg-primary/5 p-3">
              <p className="text-sm font-semibold">{service.label}</p>
              <p className="mt-1 text-lg font-bold text-primary">
                {formatPrice(service.price)}
                <span className="ml-1 text-xs font-medium text-text-secondary">
                  + tax per plate
                </span>
              </p>
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

            {isAuthenticated ? (
              <OnamDeliveryAddress
                selectedAddressId={selectedAddressId}
                onSelect={setSelectedAddressId}
                onLoadingChange={setIsAddressLoading}
                requestAddAddress={requestAddAddress}
              />
            ) : !isAuthLoading ? (
              <p className="mt-5 text-sm text-text-secondary">
                After you sign in, confirm your delivery address or add a new
                one.
              </p>
            ) : null}

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
              <Button
                type="button"
                variant="primary"
                fullWidth
                size="lg"
                disabled={
                  isUpdating ||
                  (isAuthenticated && isAddressLoading)
                }
                onClick={() => placeOnamWhatsAppOrder(true)}
              >
                {isUpdating
                  ? 'Preparing details…'
                  : isAuthenticated && isAddressLoading
                    ? 'Loading address…'
                    : 'Send order on WhatsApp'}
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
            {showWhatsAppPreview ? (
              <div className="mt-4 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-3">
                <p className="text-sm font-semibold text-text-primary">
                  Review before sending (testing)
                </p>
                <div className="mt-3 space-y-3">
                  <Input
                    label="Send to WhatsApp number"
                    value={whatsAppTargetPhone}
                    onChange={(event) => setWhatsAppTargetPhone(event.target.value)}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                  />
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-secondary">
                      Message preview
                    </p>
                    <textarea
                      value={whatsAppPreviewMessage}
                      onChange={(event) => setWhatsAppPreviewMessage(event.target.value)}
                      rows={10}
                      className="w-full rounded-[var(--radius-input)] border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" className="flex-1" onClick={openWhatsAppWithPreview}>
                      Open WhatsApp
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setShowWhatsAppPreview(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
            {whatsApp.enabled ? (
            <p className="mt-3 text-xs text-text-secondary">
              This sends full order + customer details to {ONAM_SADHYA.restaurant} so
              they can share UPI payment and confirm your booking.
            </p>
            ) : (
            <p className="mt-3 text-xs text-text-secondary">
              Online orders keep the same slot as a delivery note for 25–26
              August.
            </p>
            )}
          </aside>
        </div>
      </Container>
    </div>
  )
}
