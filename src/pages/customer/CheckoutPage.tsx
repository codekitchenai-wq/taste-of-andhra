import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  CreditCard,
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
import { Textarea } from '@/components/ui/Textarea'
import {
  ONLINE_PAYMENT_CHANNELS,
  type OnlinePaymentChannel,
} from '@/constants/PAYMENT_METHOD'
import { ROUTES } from '@/constants/ROUTES'
import { useAddresses } from '@/hooks/useAddresses'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import * as orderService from '@/services/orderService'
import {
  isRazorpayConfigured,
  processOnlinePayment,
} from '@/services/paymentService'
import type { PaymentMethod } from '@/types/enums'
import type { Offer } from '@/types/Offer'
import { calculateOrderTotals } from '@/utils/orderTotals'
import { cn } from '@/utils/cn'

const CHANNEL_ICONS = {
  upi: Smartphone,
  card: CreditCard,
  netbanking: Building2,
  wallet: Wallet,
} as const

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { cart, isLoading: isCartLoading, itemCount, refreshCart, clearCart } =
    useCart()
  const { addresses, isLoading: isAddressesLoading, error, refetch } =
    useAddresses()
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [onlineChannel, setOnlineChannel] =
    useState<OnlinePaymentChannel>('upi')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<{
    id: string
    orderNumber: string
    total: number
  } | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [couponCode, setCouponCode] = useState<string | undefined>()

  const isAwaitingPayment = Boolean(pendingOrder) || isPaymentOpen

  useEffect(() => {
    if (isCartLoading || isAwaitingPayment) return

    if (!cart || cart.items.length === 0) {
      navigate(ROUTES.CART, { replace: true })
    }
  }, [cart, isCartLoading, isAwaitingPayment, navigate])

  useEffect(() => {
    if (addresses.length === 0) {
      setSelectedAddressId(null)
      return
    }

    if (
      selectedAddressId &&
      addresses.some((address) => address.id === selectedAddressId)
    ) {
      return
    }

    const defaultAddress = addresses.find((address) => address.is_default)
    setSelectedAddressId(defaultAddress?.id ?? addresses[0].id)
  }, [addresses, selectedAddressId])

  const totals = useMemo(
    () => calculateOrderTotals(cart?.subtotal ?? 0, discountAmount),
    [cart?.subtotal, discountAmount],
  )

  const finishCheckout = async (orderId: string, orderNumber: string) => {
    await clearCart()
    await refreshCart()
    setIsPaymentOpen(false)
    setPendingOrder(null)
    toast.success('Order placed successfully')
    navigate(ROUTES.ORDER_SUCCESS, {
      replace: true,
      state: { orderId, orderNumber },
    })
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address')
      return
    }

    setIsPlacingOrder(true)

    const result = await orderService.createOrder({
      addressId: selectedAddressId,
      paymentMethod,
      specialInstructions,
      couponCode,
    })

    setIsPlacingOrder(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    if (paymentMethod === 'razorpay') {
      // Keep cart until payment succeeds so checkout does not bounce to /cart
      setPendingOrder({
        id: result.data.id,
        orderNumber: result.data.order_number,
        total: result.data.total,
      })
      setIsPaymentOpen(true)
      return
    }

    await finishCheckout(result.data.id, result.data.order_number)
  }

  const handleOnlinePay = async (channel: OnlinePaymentChannel) => {
    if (!pendingOrder || !user) {
      toast.error('Please sign in to complete payment')
      return
    }

    setIsPaying(true)

    const result = await processOnlinePayment({
      orderId: pendingOrder.id,
      orderNumber: pendingOrder.orderNumber,
      amount: pendingOrder.total,
      customerName: user.full_name,
      customerEmail: user.email,
      customerPhone: user.phone,
      channel,
    })

    setIsPaying(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(
      result.data.mode === 'demo'
        ? 'Demo payment successful'
        : 'Payment successful',
    )
    await finishCheckout(pendingOrder.id, pendingOrder.orderNumber)
  }

  const isLoading = isCartLoading || isAddressesLoading
  const showCheckout =
    !isLoading &&
    !error &&
    ((cart && cart.items.length > 0) || isAwaitingPayment)

  return (
    <Container as="div" className="py-8 md:py-12">
      <PageHeader
        title="Checkout"
        description="Select your delivery address, choose payment, and confirm your order."
      />

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {showCheckout && cart && cart.items.length > 0 && (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-text-primary">
                  Delivery Address
                </h2>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddressModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Address
                </Button>
              </div>

              {addresses.length === 0 ? (
                <div className="rounded-[var(--radius-card)] border border-dashed border-gray-300 bg-surface p-6 text-center">
                  <p className="text-sm text-text-secondary">
                    No saved addresses yet. Add one to continue.
                  </p>
                  <Button
                    type="button"
                    className="mt-4"
                    onClick={() => setIsAddressModalOpen(true)}
                  >
                    Add Address
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <AddressCard
                      key={address.id}
                      address={address}
                      selected={selectedAddressId === address.id}
                      onSelect={setSelectedAddressId}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Payment Method
              </h2>
              <PaymentMethodSelector
                value={paymentMethod}
                onChange={setPaymentMethod}
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

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Coupon
              </h2>
              <CouponInput
                subtotal={cart.subtotal}
                appliedOffer={appliedOffer}
                discountAmount={discountAmount}
                onApply={(offer, discount) => {
                  setAppliedOffer(offer)
                  setDiscountAmount(discount)
                  setCouponCode(offer.coupon_code ?? undefined)
                }}
                onRemove={() => {
                  setAppliedOffer(null)
                  setDiscountAmount(0)
                  setCouponCode(undefined)
                }}
              />
            </section>

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

          <div className="space-y-4">
            <CheckoutOrderSummary
              items={cart.items}
              totals={totals}
              itemCount={itemCount}
            />

            <Button
              type="button"
              fullWidth
              size="lg"
              disabled={
                isPlacingOrder ||
                !selectedAddressId ||
                addresses.length === 0
              }
              onClick={() => void handlePlaceOrder()}
            >
              {isPlacingOrder
                ? 'Creating order...'
                : paymentMethod === 'razorpay'
                  ? 'Continue to Payment'
                  : 'Place Order'}
            </Button>
          </div>
        </div>
      )}

      <AddressFormModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSuccess={(addressId) => {
          void refetch()
          setSelectedAddressId(addressId)
        }}
      />

      {pendingOrder && (
        <PaymentCheckoutModal
          isOpen={isPaymentOpen}
          amount={pendingOrder.total}
          orderNumber={pendingOrder.orderNumber}
          initialChannel={onlineChannel}
          isProcessing={isPaying}
          isDemoMode={!isRazorpayConfigured()}
          onClose={() => {
            if (isPaying) return
            setIsPaymentOpen(false)
            toast(
              'Order saved as pending. You can complete payment from My Orders.',
            )
            navigate(ROUTES.ORDER_DETAILS(pendingOrder.id), { replace: true })
            setPendingOrder(null)
          }}
          onPay={(channel) => void handleOnlinePay(channel)}
        />
      )}
    </Container>
  )
}
