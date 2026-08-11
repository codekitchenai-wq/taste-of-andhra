import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ROUTES } from '@/constants/ROUTES'
import { formatPrice } from '@/utils/format'

interface CartSummaryProps {
  subtotal: number
  itemCount: number
  isUpdating: boolean
  onClearCart: () => void
  storeClosedMessage?: string | null
  isStoreStatusLoading?: boolean
}

export function CartSummary({
  subtotal,
  itemCount,
  isUpdating,
  onClearCart,
  storeClosedMessage = null,
  isStoreStatusLoading = false,
}: CartSummaryProps) {
  const checkoutBlocked = Boolean(storeClosedMessage) || isStoreStatusLoading

  return (
    <Card className="sticky top-24 space-y-4 p-6">
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

      {storeClosedMessage && (
        <p className="rounded-[var(--radius-button)] bg-error/10 px-3 py-2 text-sm text-error">
          {storeClosedMessage}
        </p>
      )}

      {checkoutBlocked ? (
        <Button fullWidth disabled>
          {isStoreStatusLoading
            ? 'Checking store hours…'
            : 'Store closed — cannot checkout'}
        </Button>
      ) : (
        <Link to={ROUTES.CHECKOUT} className="block">
          <Button fullWidth disabled={itemCount === 0 || isUpdating}>
            Proceed to Checkout
          </Button>
        </Link>
      )}

      <Button
        type="button"
        variant="ghost"
        fullWidth
        disabled={itemCount === 0 || isUpdating}
        onClick={onClearCart}
      >
        Clear Cart
      </Button>
    </Card>
  )
}
