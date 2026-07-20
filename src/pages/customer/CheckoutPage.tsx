import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { AddressCard } from '@/components/checkout/AddressCard'
import { AddressFormModal } from '@/components/checkout/AddressFormModal'
import { CheckoutOrderSummary } from '@/components/checkout/CheckoutOrderSummary'
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Textarea } from '@/components/ui/Textarea'
import { ROUTES } from '@/constants/ROUTES'
import { useAddresses } from '@/hooks/useAddresses'
import { useCart } from '@/hooks/useCart'
import * as orderService from '@/services/orderService'
import type { PaymentMethod } from '@/types/enums'
import { calculateOrderTotals } from '@/utils/orderTotals'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { cart, isLoading: isCartLoading, itemCount, refreshCart } = useCart()
  const { addresses, isLoading: isAddressesLoading, error, refetch } =
    useAddresses()
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  useEffect(() => {
    if (isCartLoading) return

    if (!cart || cart.items.length === 0) {
      navigate(ROUTES.CART, { replace: true })
    }
  }, [cart, isCartLoading, navigate])

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
    () => calculateOrderTotals(cart?.subtotal ?? 0),
    [cart?.subtotal],
  )

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
    })

    setIsPlacingOrder(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    await refreshCart()

    toast.success('Order placed successfully')
    navigate(ROUTES.ORDER_SUCCESS, {
      replace: true,
      state: {
        orderId: result.data.id,
        orderNumber: result.data.order_number,
      },
    })
  }

  const isLoading = isCartLoading || isAddressesLoading

  return (
    <Container as="div" className="py-8 md:py-12">
      <PageHeader
        title="Checkout"
        description="Select your delivery address, review your order, and confirm payment."
      />

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && cart && cart.items.length > 0 && (
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
              className="inline-block text-sm font-medium text-primary transition-colors hover:text-primary-dark"
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
              {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
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
    </Container>
  )
}
