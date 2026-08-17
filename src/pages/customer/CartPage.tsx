import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { CartItemRow } from '@/components/cart/CartItemRow'
import { CartMobileCheckoutBar, CartSummary } from '@/components/cart/CartSummary'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useStoreOpenStatus } from '@/hooks/useStoreOpenStatus'
import {
  isFutureOnamSchedule,
  onamScheduledAt,
  readOnamPrebook,
} from '@/utils/onamPrebook'

export default function CartPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const {
    cart,
    isLoading,
    isUpdating,
    itemCount,
    subtotal,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart,
  } = useCart()
  const { status: storeStatus, isLoading: isStoreStatusLoading } =
    useStoreOpenStatus()
  const desktopCheckoutRef = useRef<HTMLButtonElement>(null)
  const mobileCheckoutRef = useRef<HTMLButtonElement>(null)

  const onamPrebook = readOnamPrebook()
  const isOnamPrebook = isFutureOnamSchedule(
    onamPrebook
      ? onamScheduledAt(onamPrebook.date, onamPrebook.slot)
      : null,
  )
  const storeClosedMessage =
    !isOnamPrebook &&
    !isStoreStatusLoading &&
    storeStatus &&
    !storeStatus.isOpen
      ? storeStatus.reason
      : null

  useEffect(() => {
    if (isLoading || !cart?.items.length) return

    const isDesktop = window.matchMedia('(min-width: 1024px)').matches
    const button = isDesktop
      ? desktopCheckoutRef.current
      : mobileCheckoutRef.current
    if (!button) return

    button.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    button.focus({ preventScroll: true })
  }, [isLoading, cart?.items.length])

  const handleUpdateQuantity = async (cartItemId: string, quantity: number) => {
    const result = await updateQuantity(cartItemId, quantity)

    if (!result.success) {
      toast.error(result.message)
    }
  }

  const handleRemoveItem = async (cartItemId: string) => {
    const result = await removeItem(cartItemId)

    if (result.success) {
      toast.success('Item removed from cart')
      return
    }

    toast.error(result.message)
  }

  const handleClearCart = async () => {
    const result = await clearCart()

    if (result.success) {
      toast.success('Cart cleared')
      return
    }

    toast.error(result.message)
  }

  if (!isAuthenticated) {
    return (
      <Container as="div" className="py-8 md:py-12">
        <PageHeader
          title="Your Cart"
          description="Sign in to view and manage your cart."
        />
        <EmptyState
          title="Sign in to continue"
          description="Create an account or sign in to add dishes and save your cart."
          actionLabel="Sign In"
          onAction={() => navigate(ROUTES.LOGIN, { state: { from: ROUTES.CART } })}
        />
      </Container>
    )
  }

  return (
    <Container as="div" className="py-8 md:py-12">
      <PageHeader
        title="Your Cart"
        description="Review items, adjust quantities, and proceed to checkout."
      />

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && !cart && (
        <ErrorState message="Unable to load your cart." onRetry={() => void refreshCart()} />
      )}

      {!isLoading && cart && cart.items.length === 0 && (
        <EmptyState
          title="Your cart is empty"
          description="Browse the menu and add your favorite Andhra dishes."
          actionLabel="Browse Menu"
          onAction={() => navigate(ROUTES.MENU)}
        />
      )}

      {!isLoading && cart && cart.items.length > 0 && (
        <>
          <div className="grid min-w-0 items-start gap-8 overflow-x-hidden pb-28 lg:grid-cols-[minmax(0,1fr)_320px] lg:pb-0">
            <div className="min-w-0 space-y-4">
              {cart.items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  isUpdating={isUpdating}
                  onUpdateQuantity={(cartItemId, quantity) =>
                    void handleUpdateQuantity(cartItemId, quantity)
                  }
                  onRemove={(cartItemId) => void handleRemoveItem(cartItemId)}
                />
              ))}

              <Link
                to={ROUTES.MENU}
                className="inline-block text-sm font-medium text-primary transition-colors hover:text-primary-dark"
              >
                Continue shopping
              </Link>
            </div>

            <div className="lg:sticky lg:top-[88px] lg:self-start">
              <CartSummary
                subtotal={subtotal}
                itemCount={itemCount}
                isUpdating={isUpdating}
                onClearCart={() => void handleClearCart()}
                isStoreStatusLoading={isStoreStatusLoading}
                storeClosedMessage={storeClosedMessage}
                checkoutButtonRef={desktopCheckoutRef}
              />
            </div>
          </div>

          <CartMobileCheckoutBar
            ref={mobileCheckoutRef}
            subtotal={subtotal}
            itemCount={itemCount}
            isUpdating={isUpdating}
            onClearCart={() => void handleClearCart()}
            isStoreStatusLoading={isStoreStatusLoading}
            storeClosedMessage={storeClosedMessage}
          />
        </>
      )}
    </Container>
  )
}
