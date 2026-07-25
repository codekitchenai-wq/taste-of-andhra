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
import { useAddresses } from '@/hooks/useAddresses'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useSelectedBranch } from '@/hooks/useSelectedBranch'
import * as loyaltyService from '@/services/loyaltyService'
import * as orderService from '@/services/orderService'
import {
  isRazorpayConfigured,
  processOnlinePayment,
} from '@/services/paymentService'
import type { LoyaltyAccount } from '@/types/Loyalty'
import type { PaymentMethod } from '@/types/enums'
import type { Offer } from '@/types/Offer'
import { calculateOrderTotals } from '@/utils/orderTotals'
import { cn } from '@/utils/cn'
import { formatPrice } from '@/utils/format'

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
  const { branches, selectedBranch, setSelectedBranchId } = useSelectedBranch()
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
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponCode, setCouponCode] = useState<string | undefined>()
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(
    null,
  )
  const [redeemLoyalty, setRedeemLoyalty] = useState(false)

  const isAwaitingPayment = Boolean(pendingOrder) || isPaymentOpen

  useEffect(() => {
    if (isCartLoading || isAwaitingPayment) return

    if (!cart || cart.items.length === 0) {
      navigate(ROUTES.CART, { replace: true })
    }
  }, [cart, isCartLoading, isAwaitingPayment, navigate])

  useEffect(() => {
    if (addresses.length === 0) return
    if (selectedAddressId) return

    const defaultAddress =
      addresses.find((address) => address.is_default) ?? addresses[0]
    setSelectedAddressId(defaultAddress?.id ?? null)
  }, [addresses, selectedAddressId])

  useEffect(() => {
    void loyaltyService.getOrCreateAccount().then((result) => {
      if (result.success) setLoyaltyAccount(result.data)
    })
  }, [user?.id])

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

    if (!selectedBranch) {
      toast.error('Please select a branch')
      return
    }

    setIsPlacingOrder(true)

    const result = await orderService.createOrder({
      addressId: selectedAddressId,
      paymentMethod,
      specialInstructions,
      couponCode,
      branchId: selectedBranch.id,
      loyaltyPointsToRedeem:
        loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem : undefined,
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

    await finishCheckout(result.data.id, result.data.order_number)
  }

  const handlePaymentConfirm = async (channel: OnlinePaymentChannel) => {
    if (!pendingOrder) return

    setIsPaying(true)
    const result = await processOnlinePayment({
      orderId: pendingOrder.id,
      orderNumber: pendingOrder.orderNumber,
      amount: pendingOrder.total,
      channel,
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
                onClick={() => setIsAddressModalOpen(true)}
              >
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                Add new
              </Button>
            </div>

            {addresses.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Add a delivery address to continue.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((address) => (
                  <AddressCard
                    key={address.id}
                    address={address}
                    selected={selectedAddressId === address.id}
                    onSelect={() => setSelectedAddressId(address.id)}
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
              addresses.length === 0 ||
              !selectedBranch
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

      <AddressFormModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSuccess={() => {
          setIsAddressModalOpen(false)
          void refetch()
        }}
      />

      <PaymentCheckoutModal
        isOpen={isPaymentOpen}
        amount={pendingOrder?.total ?? totals.total}
        orderNumber={pendingOrder?.orderNumber ?? ''}
        isProcessing={isPaying}
        isDemoMode={!isRazorpayConfigured()}
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
