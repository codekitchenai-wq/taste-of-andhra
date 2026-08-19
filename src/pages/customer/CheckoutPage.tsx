import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  CreditCard,
  MapPin,
  MapPinOff,
  Plus,
  Smartphone,
  Wallet,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AddressCard } from '@/components/checkout/AddressCard'
import { AddressFormModal } from '@/components/checkout/AddressFormModal'
import { CheckoutOrderSummary } from '@/components/checkout/CheckoutOrderSummary'
import { CouponInput } from '@/components/checkout/CouponInput'
import { PaymentCheckoutModal } from '@/components/checkout/PaymentCheckoutModal'
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  LOYALTY_REDEEM_POINTS,
  LOYALTY_REDEEM_VALUE,
} from '@/constants/LOYALTY'
import {
  ONLINE_PAYMENT_CHANNELS,
  type OnlinePaymentChannel,
} from '@/constants/PAYMENT_METHOD'
import { ROUTES } from '@/constants/ROUTES'
import { useOrganization } from '@/contexts/OrganizationContext'
import { storefrontContact } from '@/utils/storefrontCopy'
import { useAddresses } from '@/hooks/useAddresses'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useDeliveryQuote } from '@/hooks/useDeliveryQuote'
import { useDeliverySettings } from '@/hooks/useDeliverySettings'
import { useSelectedBranch } from '@/hooks/useSelectedBranch'
import { useGstSettings } from '@/hooks/useGstSettings'
import { useStoreOpenStatus } from '@/hooks/useStoreOpenStatus'
import * as deliverySettingsService from '@/services/deliverySettingsService'
import * as loyaltyService from '@/services/loyaltyService'
import * as orderService from '@/services/orderService'
import {
  isRazorpayConfigured,
  processOnlinePayment,
} from '@/services/paymentService'
import type { Address } from '@/types/Address'
import type { LoyaltyAccount } from '@/types/Loyalty'
import type { PaymentMethod } from '@/types/enums'
import type { Offer } from '@/types/Offer'
import { effectiveOrderTaxRate } from '@/utils/gstSettings'
import { restaurantLocationFromBranch } from '@/utils/nearbyAddress'
import { calculateOrderTotals } from '@/utils/orderTotals'
import { cn } from '@/utils/cn'
import { formatPrice } from '@/utils/format'
import { readCheckoutAddressId } from '@/utils/checkoutAddress'
import {
  clearOnamPrebook,
  isFutureOnamSchedule,
  onamOrderNote,
  onamScheduledAt,
  readOnamPrebook,
} from '@/utils/onamPrebook'

const CHANNEL_ICONS = {
  upi: Smartphone,
  card: CreditCard,
  netbanking: Building2,
  wallet: Wallet,
} as const

export default function CheckoutPage() {
  const navigate = useNavigate()
  const org = useOrganization()
  const contact = storefrontContact(org)
  const { user } = useAuth()
  const { cart, isLoading: isCartLoading, itemCount, refreshCart, clearCart } =
    useCart()
  const { addresses, isLoading: isAddressesLoading, error, refetch } =
    useAddresses()
  const { branches, selectedBranch, setSelectedBranchId, isLoading: isBranchLoading } =
    useSelectedBranch()
  const { status: storeStatus, isLoading: isStoreStatusLoading } =
    useStoreOpenStatus()
  const { settings: gstSettings } = useGstSettings()
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pay_later')
  const [onlineChannel, setOnlineChannel] =
    useState<OnlinePaymentChannel>('upi')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [addressToEdit, setAddressToEdit] = useState<Address | null>(null)
  const [hasPromptedForAddress, setHasPromptedForAddress] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<{
    id: string
    orderNumber: string
    total: number
  } | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponCode, setCouponCode] = useState<string | undefined>()
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(
    null,
  )
  const [redeemLoyalty, setRedeemLoyalty] = useState(false)
  const [isCompletingCheckout, setIsCompletingCheckout] = useState(false)
  const [onamPrebook] = useState(() => readOnamPrebook())
  const onamSchedule = onamPrebook
    ? onamScheduledAt(onamPrebook.date, onamPrebook.slot)
    : null
  const isOnamPrebook = isFutureOnamSchedule(onamSchedule)

  const isAwaitingPayment = Boolean(pendingOrder) || isPaymentOpen
  const shouldStayOnCheckout =
    isCartLoading ||
    isAwaitingPayment ||
    isPlacingOrder ||
    isCompletingCheckout

  useEffect(() => {
    if (shouldStayOnCheckout) return

    if (!cart || cart.items.length === 0) {
      navigate(ROUTES.CART, { replace: true })
    }
  }, [cart, shouldStayOnCheckout, navigate])

  useEffect(() => {
    if (addresses.length === 0) return
    if (selectedAddressId) return

    const storedId = readCheckoutAddressId()
    const storedAddress =
      storedId && addresses.some((address) => address.id === storedId)
        ? storedId
        : null
    const defaultAddress =
      addresses.find((address) => address.is_default) ?? addresses[0]
    setSelectedAddressId(storedAddress ?? defaultAddress?.id ?? null)
  }, [addresses, selectedAddressId])

  useEffect(() => {
    if (isAddressesLoading || hasPromptedForAddress) return
    if (addresses.length > 0) return

    setAddressToEdit(null)
    setIsAddressModalOpen(true)
    setHasPromptedForAddress(true)
  }, [addresses.length, hasPromptedForAddress, isAddressesLoading])

  useEffect(() => {
    if (!onamPrebook) return
    const note = onamOrderNote(onamPrebook)
    setSpecialInstructions((current) =>
      current.includes('ONAM SADHYA PRE-BOOK')
        ? current
        : [note, current].filter(Boolean).join('\n\n'),
    )
  }, [onamPrebook])

  useEffect(() => {
    void loyaltyService.getOrCreateAccount().then((result) => {
      if (result.success) setLoyaltyAccount(result.data)
    })
  }, [user?.id, org.organizationId])

  const maxLoyalty = useMemo(() => {
    if (!loyaltyAccount || !cart) {
      return { points: 0, discount: 0 }
    }
    return loyaltyService.maxRedeemableDiscount(
      loyaltyAccount.points_balance,
      Math.max(0, cart.subtotal - couponDiscount),
    )
  }, [loyaltyAccount, cart, couponDiscount])

  const loyaltyDiscount =
    redeemLoyalty && maxLoyalty.points > 0 ? maxLoyalty.discount : 0
  const loyaltyPointsToRedeem =
    redeemLoyalty && maxLoyalty.points > 0 ? maxLoyalty.points : 0

  const discountAmount = couponDiscount + loyaltyDiscount

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  )

  const { quote: deliveryQuote, isLoading: isQuoteLoading } = useDeliveryQuote({
    address: selectedAddress,
    branchId: selectedBranch?.id ?? null,
    subtotal: cart?.subtotal ?? 0,
    itemCount,
  })

  const { settings: deliverySettings } = useDeliverySettings(
    selectedBranch?.id ?? null,
  )

  const serviceAreaNotice = useMemo(
    () =>
      deliverySettings
        ? deliverySettingsService.serviceAreaNotice(
            deliverySettings,
            selectedBranch?.name,
          )
        : null,
    [deliverySettings, selectedBranch?.name],
  )

  const totals = useMemo(
    () =>
      calculateOrderTotals(
        cart?.subtotal ?? 0,
        discountAmount,
        deliveryQuote?.isServiceable ? deliveryQuote.amount : undefined,
        effectiveOrderTaxRate(gstSettings.enabled),
      ),
    [cart?.subtotal, discountAmount, deliveryQuote, gstSettings.enabled],
  )

  const isUnserviceable = deliveryQuote?.isServiceable === false
  const showUnserviceable = isUnserviceable

  const needsAddress = addresses.length === 0 || !selectedAddressId

  const checkoutBlockReason = useMemo(() => {
    if (isPlacingOrder) return 'placing'
    if (isStoreStatusLoading || isQuoteLoading || isBranchLoading) {
      return 'loading'
    }
    if (storeStatus && !storeStatus.isOpen && !isOnamPrebook) return 'closed'
    if (needsAddress) return 'address'
    if (branches.length > 0 && !selectedBranch) return 'branch'
    if (showUnserviceable) return 'unserviceable'
    return null
  }, [
    isPlacingOrder,
    isStoreStatusLoading,
    isQuoteLoading,
    isBranchLoading,
    storeStatus,
    isOnamPrebook,
    needsAddress,
    branches.length,
    selectedBranch,
    showUnserviceable,
  ])

  const checkoutButtonLabel = useMemo(() => {
    switch (checkoutBlockReason) {
      case 'placing':
        return 'Creating order...'
      case 'loading':
        return 'Preparing checkout...'
      case 'closed':
        return 'Store closed'
      case 'address':
        return 'Add delivery address'
      case 'branch':
        return 'Select a branch'
      case 'unserviceable':
        return 'Not deliverable here'
      default:
        return paymentMethod === 'razorpay'
          ? 'Continue to Payment'
          : 'Place Order'
    }
  }, [checkoutBlockReason, paymentMethod])

  const openAddAddress = () => {
    setAddressToEdit(null)
    setIsAddressModalOpen(true)
  }

  const openEditAddress = (address: Address) => {
    setAddressToEdit(address)
    setIsAddressModalOpen(true)
  }

  const handleCheckoutClick = () => {
    if (checkoutBlockReason === 'address') {
      openAddAddress()
      return
    }

    void handlePlaceOrder()
  }

  const finishCheckout = async (
    orderId: string,
    orderNumber: string,
    options?: {
      paymentMethod?: PaymentMethod
      paymentShareToken?: string | null
    },
  ) => {
    setIsCompletingCheckout(true)
    try {
      await clearCart()
      await refreshCart()
      clearOnamPrebook()
      setIsPaymentOpen(false)
      setPendingOrder(null)
      toast.success('Order placed successfully')
      navigate(ROUTES.ORDER_SUCCESS, {
        replace: true,
        state: {
          orderId,
          orderNumber,
          paymentMethod: options?.paymentMethod,
          paymentShareToken: options?.paymentShareToken ?? null,
        },
      })
    } catch (error) {
      setIsCompletingCheckout(false)
      throw error
    }
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address')
      return
    }

    if (branches.length > 0 && !selectedBranch) {
      toast.error('Please select a branch')
      return
    }

    if (
      !isOnamPrebook &&
      !isStoreStatusLoading &&
      storeStatus &&
      !storeStatus.isOpen
    ) {
      toast.error(storeStatus.reason)
      return
    }

    if (isUnserviceable) {
      toast.error(
        deliveryQuote?.unserviceableReason ??
          'We do not deliver to this address yet.',
      )
      return
    }

    if (isQuoteLoading) {
      toast.error('Please wait while we calculate your delivery charge')
      return
    }

    setIsPlacingOrder(true)

    const result = await orderService.createOrder({
      addressId: selectedAddressId,
      paymentMethod,
      specialInstructions,
      couponCode,
      branchId: selectedBranch?.id,
      deliveryQuoteId: deliveryQuote?.quoteId ?? null,
      loyaltyPointsToRedeem:
        loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem : undefined,
      whatsappUpdatesOptIn: org.storefrontWhatsAppEnabled,
      scheduledFor: onamSchedule,
    })

    setIsPlacingOrder(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    if (paymentMethod === 'razorpay') {
      setPendingOrder({
        id: result.data.id,
        orderNumber: result.data.order_number,
        total: result.data.total,
      })
      setIsPaymentOpen(true)
      return
    }

    await finishCheckout(result.data.id, result.data.order_number, {
      paymentMethod: result.data.payment_method,
      paymentShareToken: result.data.payment_share_token ?? null,
    })
  }

  const handlePaymentConfirm = async (channel: OnlinePaymentChannel) => {
    if (!pendingOrder) return

    setIsPaying(true)
    const result = await processOnlinePayment({
      orderId: pendingOrder.id,
      orderNumber: pendingOrder.orderNumber,
      amount: pendingOrder.total,
      channel,
      restaurantName: contact.name,
      customerName: user?.full_name ?? 'Customer',
      customerPhone: user?.phone ?? undefined,
      customerEmail: user?.email ?? undefined,
    })
    setIsPaying(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    await finishCheckout(pendingOrder.id, pendingOrder.orderNumber)
  }

  if (isCartLoading || isAddressesLoading) {
    return (
      <Container as="div" className="py-8 md:py-12">
        <LoadingState variant="inline" />
      </Container>
    )
  }

  if (error) {
    return (
      <Container as="div" className="py-8 md:py-12">
        <ErrorState message={error} onRetry={() => void refetch()} />
      </Container>
    )
  }

  if (!cart || cart.items.length === 0) {
    return null
  }

  return (
    <Container as="div" className="py-8 md:py-12">
      <nav aria-label="Checkout navigation" className="mb-4">
        <Link
          to={ROUTES.MENU}
          className="text-sm font-medium text-primary transition-colors hover:text-primary-dark"
        >
          Back to Menu
        </Link>
      </nav>

      <PageHeader
        title="Checkout"
        description="Confirm your branch, address, payment, and place your order."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {branches.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Branch
              </h2>
              <Select
                label="Fulfilment branch"
                value={selectedBranch?.id ?? ''}
                onChange={(event) => setSelectedBranchId(event.target.value)}
                options={branches.map((branch) => ({
                  value: branch.id,
                  label: `${branch.name} — ${branch.city}`,
                }))}
              />
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Delivery Address
              </h2>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={openAddAddress}
              >
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                Add new
              </Button>
            </div>

            {serviceAreaNotice && (
              <p className="flex items-start gap-2 text-sm text-text-secondary">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {serviceAreaNotice}
              </p>
            )}

            {addresses.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-primary/30 bg-primary/5 p-4">
                <p className="text-sm text-text-primary">
                  Add a delivery address to continue to payment.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  onClick={openAddAddress}
                >
                  <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                  Add delivery address
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((address) => (
                  <AddressCard
                    key={address.id}
                    address={address}
                    selected={selectedAddressId === address.id}
                    onSelect={() => setSelectedAddressId(address.id)}
                    onEdit={openEditAddress}
                  />
                ))}
              </div>
            )}

            {showUnserviceable ? (
              <div
                className="flex items-start gap-3 rounded-[var(--radius-card)] border border-error/30 bg-error/5 p-4"
                role="alert"
              >
                <MapPinOff
                  className="mt-0.5 h-5 w-5 shrink-0 text-error"
                  aria-hidden="true"
                />
                <div className="text-sm">
                  <p className="font-medium text-text-primary">
                    Outside our delivery area
                  </p>
                  <p className="mt-1 text-text-secondary">
                    {deliveryQuote?.unserviceableReason ??
                      'We cannot deliver to this address yet.'}{' '}
                    Choose a different address to continue.
                  </p>
                </div>
              </div>
            ) : null}

            {!isOnamPrebook &&
              !isStoreStatusLoading &&
              storeStatus &&
              !storeStatus.isOpen && (
              <div
                className="rounded-[var(--radius-card)] border border-error/30 bg-error/5 p-4 text-sm text-error"
                role="alert"
              >
                <p className="font-medium text-text-primary">Store closed</p>
                <p className="mt-1 text-text-secondary">{storeStatus.reason}</p>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Coupon</h2>
            <CouponInput
              subtotal={cart.subtotal}
              appliedOffer={appliedOffer}
              discountAmount={couponDiscount}
              onApply={(offer, discount) => {
                setAppliedOffer(offer)
                setCouponDiscount(discount)
                setCouponCode(offer.coupon_code ?? undefined)
              }}
              onRemove={() => {
                setAppliedOffer(null)
                setCouponDiscount(0)
                setCouponCode(undefined)
              }}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Payment Method
            </h2>
            <PaymentMethodSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
              organizationId={org.organizationId}
            />

            {paymentMethod === 'razorpay' && (
              <div className="space-y-3 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium text-text-primary">
                  Choose online option
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ONLINE_PAYMENT_CHANNELS.map((option) => {
                    const Icon = CHANNEL_ICONS[option.id]
                    const selected = onlineChannel === option.id

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setOnlineChannel(option.id)}
                        className={cn(
                          'flex min-h-[76px] flex-col items-start gap-1 rounded-[var(--radius-button)] border bg-surface p-3 text-left transition-colors',
                          selected
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-gray-200 hover:border-primary/30',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5',
                            selected ? 'text-primary' : 'text-text-secondary',
                          )}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-semibold text-text-primary">
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-text-secondary">
                  Next you’ll enter UPI / card / bank details and confirm
                  payment.
                </p>
              </div>
            )}
          </section>

          {loyaltyAccount &&
            loyaltyAccount.points_balance >= LOYALTY_REDEEM_POINTS && (
              <section className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
                <h2 className="text-lg font-semibold text-text-primary">
                  Loyalty Points
                </h2>
                <p className="text-sm text-text-secondary">
                  You have {loyaltyAccount.points_balance} points. Redeem{' '}
                  {LOYALTY_REDEEM_POINTS} points for{' '}
                  {formatPrice(LOYALTY_REDEEM_VALUE)} off (max{' '}
                  {formatPrice(maxLoyalty.discount)} on this order).
                </p>
                <label className="flex cursor-pointer items-center gap-3 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={redeemLoyalty}
                    disabled={maxLoyalty.points <= 0}
                    onChange={(event) => setRedeemLoyalty(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Use {maxLoyalty.points} points (−
                  {formatPrice(maxLoyalty.discount)})
                </label>
              </section>
            )}

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Special Instructions
            </h2>
            <Textarea
              placeholder="Any delivery notes or preferences (optional)"
              value={specialInstructions}
              onChange={(event) => setSpecialInstructions(event.target.value)}
              rows={3}
            />
          </section>

          <Link
            to={ROUTES.CART}
            className="inline-flex text-sm font-medium text-primary transition-colors hover:text-primary-dark"
          >
            Back to cart
          </Link>
        </div>

        <div className="lg:sticky lg:top-[88px] lg:self-start">
          <CheckoutOrderSummary
            items={cart.items}
            totals={totals}
            itemCount={itemCount}
            deliveryQuote={deliveryQuote}
            isDeliveryQuoteLoading={isQuoteLoading}
            action={
              <>
                {checkoutBlockReason === 'address' && (
                  <p className="mb-2 text-xs text-text-secondary">
                    A delivery address is required before you can pay.
                  </p>
                )}

                <Button
                  type="button"
                  fullWidth
                  size="lg"
                  disabled={
                    checkoutBlockReason !== null &&
                    checkoutBlockReason !== 'address'
                  }
                  onClick={handleCheckoutClick}
                >
                  {checkoutButtonLabel}
                </Button>

                <Link to={ROUTES.MENU} className="mt-3 block">
                  <Button type="button" variant="secondary" fullWidth>
                    Back to Menu
                  </Button>
                </Link>
              </>
            }
          />
        </div>
      </div>

      <AddressFormModal
        isOpen={isAddressModalOpen}
        addressToEdit={addressToEdit}
        restaurantLocation={restaurantLocationFromBranch(selectedBranch)}
        branchId={selectedBranch?.id ?? null}
        subtotal={cart?.subtotal ?? 0}
        onClose={() => {
          setIsAddressModalOpen(false)
          setAddressToEdit(null)
        }}
        onSuccess={(addressId) => {
          setIsAddressModalOpen(false)
          setAddressToEdit(null)
          setSelectedAddressId(addressId)
          void refetch()
        }}
      />

      <PaymentCheckoutModal
        isOpen={isPaymentOpen}
        amount={pendingOrder?.total ?? totals.total}
        orderNumber={pendingOrder?.orderNumber ?? ''}
        isProcessing={isPaying}
        isDemoMode={
          !isRazorpayConfigured({
            settings: org.settings,
            slug: org.slug,
            organizationId: org.organizationId,
          })
        }
        initialChannel={onlineChannel}
        onClose={() => {
          if (isPaying) return
          setIsPaymentOpen(false)
        }}
        onPay={(channel) => void handlePaymentConfirm(channel)}
      />
    </Container>
  )
}
