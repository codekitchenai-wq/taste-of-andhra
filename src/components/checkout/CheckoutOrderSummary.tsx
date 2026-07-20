import { Card } from '@/components/ui/Card'
import { FREE_DELIVERY_THRESHOLD } from '@/constants/ORDER'
import type { CartItem } from '@/types/Cart'
import type { OrderTotals } from '@/utils/orderTotals'
import { formatPrice } from '@/utils/format'

interface CheckoutOrderSummaryProps {
  items: CartItem[]
  totals: OrderTotals
  itemCount: number
}

export function CheckoutOrderSummary({
  items,
  totals,
  itemCount,
}: CheckoutOrderSummaryProps) {
  return (
    <Card className="sticky top-24 space-y-4 p-6">
      <h2 className="text-lg font-semibold text-text-primary">Order Summary</h2>

      <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
        {items.map((item) => {
          const dish = item.dish

          if (!dish) return null

          return (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-text-primary">{dish.name}</p>
                <p className="text-text-secondary">
                  {item.quantity} × {formatPrice(dish.price)}
                </p>
              </div>
              <span className="shrink-0 font-medium text-text-primary">
                {formatPrice(dish.price * item.quantity)}
              </span>
            </li>
          )
        })}
      </ul>

      <dl className="space-y-2 border-t border-black/5 pt-4 text-sm">
        <div className="flex items-center justify-between text-text-secondary">
          <dt>Items ({itemCount})</dt>
          <dd>{formatPrice(totals.subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between text-text-secondary">
          <dt>Tax (5%)</dt>
          <dd>{formatPrice(totals.tax)}</dd>
        </div>
        <div className="flex items-center justify-between text-text-secondary">
          <dt>Delivery</dt>
          <dd>
            {totals.deliveryCharge === 0
              ? 'Free'
              : formatPrice(totals.deliveryCharge)}
          </dd>
        </div>
        {totals.subtotal < FREE_DELIVERY_THRESHOLD && (
          <p className="text-xs text-text-secondary">
            Free delivery on orders above{' '}
            {formatPrice(FREE_DELIVERY_THRESHOLD)}
          </p>
        )}
        <div className="flex items-center justify-between border-t border-black/5 pt-3 text-base font-semibold text-text-primary">
          <dt>Total</dt>
          <dd className="text-primary">{formatPrice(totals.total)}</dd>
        </div>
      </dl>
    </Card>
  )
}
