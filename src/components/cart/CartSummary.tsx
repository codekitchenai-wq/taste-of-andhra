import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ROUTES } from '@/constants/ROUTES'
import { formatPrice } from '@/utils/format'

export interface CartSummaryProps {
  subtotal: number
  itemCount: number
  isUpdating: boolean
  onClearCart: () => void
  storeClosedMessage?: string | null
  isStoreStatusLoading?: boolean
  checkoutButtonRef?: React.Ref<HTMLButtonElement>
}

function CheckoutActions({
  itemCount,
  isUpdating,
  onClearCart,
  storeClosedMessage,
  isStoreStatusLoading,
  checkoutButtonRef,
  showBackToMenu = true,
  showClearCart = true,
}: Omit<CartSummaryProps, 'subtotal'> & {
  showBackToMenu?: boolean
  showClearCart?: boolean
}) {
  const checkoutBlocked = Boolean(storeClosedMessage) || isStoreStatusLoading

  return (
    <>
      {storeClosedMessage && (
        <p className="rounded-[var(--radius-button)] bg-error/10 px-3 py-2 text-sm text-error">
          {storeClosedMessage}
        </p>
      )}

      {checkoutBlocked ? (
        <Button ref={checkoutButtonRef} fullWidth disabled>
          {isStoreStatusLoading
            ? 'Checking store hours…'
            : 'Store closed — cannot checkout'}
        </Button>
      ) : (
        <Link to={ROUTES.CHECKOUT} className="block">
          <Button
            ref={checkoutButtonRef}
            fullWidth
            disabled={itemCount === 0 || isUpdating}
          >
            Proceed to Checkout
          </Button>
        </Link>
      )}

      {showBackToMenu && (
        <Link to={ROUTES.MENU} className="block">
          <Button type="button" variant="secondary" fullWidth>
            Back to Menu
          </Button>
        </Link>
      )}

      {showClearCart && (
        <Button
          type="button"
          variant="ghost"
          fullWidth
          disabled={itemCount === 0 || isUpdating}
          onClick={onClearCart}
        >
          Clear Cart
        </Button>
      )}
    </>
  )
}

export function CartSummary({
  subtotal,
  itemCount,
  isUpdating,
  onClearCart,
  storeClosedMessage = null,
  isStoreStatusLoading = false,
  checkoutButtonRef,
}: CartSummaryProps) {
  return (
    <Card className="space-y-4 p-6">
      <h2 className="text-lg font-semibold text-text-primary">Order Summary</h2>

      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between text-text-secondary">
          <dt>Items ({itemCount})</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-black/5 pt-3 text-base font-semibold text-text-primary">
          <dt>Subtotal</dt>
          <dd className="text-primary">{formatPrice(subtotal)}</dd>
        </div>
      </dl>

      <CheckoutActions
        itemCount={itemCount}
        isUpdating={isUpdating}
        onClearCart={onClearCart}
        storeClosedMessage={storeClosedMessage}
        isStoreStatusLoading={isStoreStatusLoading}
        checkoutButtonRef={checkoutButtonRef}
      />
    </Card>
  )
}

export const CartMobileCheckoutBar = forwardRef<
  HTMLButtonElement,
  CartSummaryProps
>(  function CartMobileCheckoutBar(
  {
    subtotal,
    itemCount,
    isUpdating,
    storeClosedMessage = null,
    isStoreStatusLoading = false,
  },
  checkoutButtonRef,
) {
  const checkoutBlocked = Boolean(storeClosedMessage) || isStoreStatusLoading

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-surface/95 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden"
      aria-label="Cart checkout"
    >
      <div className="mx-auto flex w-full max-w-[1280px] items-center gap-3 px-4 md:px-6">
        <div className="min-w-0 shrink-0">
          <p className="text-xs text-text-secondary">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
          <p className="text-lg font-bold text-primary">{formatPrice(subtotal)}</p>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link to={ROUTES.MENU} className="shrink-0">
            <Button type="button" variant="secondary" size="sm" className="px-3">
              Back to Menu
            </Button>
          </Link>

          {checkoutBlocked ? (
            <Button ref={checkoutButtonRef} fullWidth disabled size="sm">
              {isStoreStatusLoading ? 'Checking…' : 'Store closed'}
            </Button>
          ) : (
            <Link to={ROUTES.CHECKOUT} className="min-w-0 flex-1">
              <Button
                ref={checkoutButtonRef}
                fullWidth
                size="sm"
                disabled={itemCount === 0 || isUpdating}
              >
                Proceed to Checkout
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
})
