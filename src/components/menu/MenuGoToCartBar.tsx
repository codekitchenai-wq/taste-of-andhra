import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ROUTES } from '@/constants/ROUTES'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/utils/format'

/** Fixed bottom bar on menu pages — always reachable while browsing dishes. */
export function MenuGoToCartBar() {
  const { itemCount, subtotal } = useCart()

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-surface/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur"
      aria-label="Go to cart"
    >
      <Container as="div" className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {itemCount > 0 ? (
            <>
              <p className="text-sm font-medium text-text-primary">
                {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart
              </p>
              <p className="text-sm text-text-secondary">{formatPrice(subtotal)}</p>
            </>
          ) : (
            <p className="text-sm text-text-secondary">Browse and add dishes to your cart</p>
          )}
        </div>
        <Link to={ROUTES.CART} className="shrink-0">
          <Button size="md" className="min-w-[9rem]">
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Go to Cart
          </Button>
        </Link>
      </Container>
    </div>
  )
}
