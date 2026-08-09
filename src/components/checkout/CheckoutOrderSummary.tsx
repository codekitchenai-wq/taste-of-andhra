import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { FREE_DELIVERY_THRESHOLD } from '@/constants/ORDER'
import type { CartItem } from '@/types/Cart'
import type { DeliveryQuote } from '@/types/DeliveryQuote'
import type { OrderTotals } from '@/utils/orderTotals'
import { formatPrice } from '@/utils/format'

interface CheckoutOrderSummaryProps {
  items: CartItem[]
  totals: OrderTotals
  itemCount: number
  deliveryQuote?: DeliveryQuote | null
  isDeliveryQuoteLoading?: boolean
  /** Place-order CTA kept inside the card so it scrolls with the summary. */
  action?: ReactNode
}

export function CheckoutOrderSummary({
  items,
  totals,
  itemCount,
  deliveryQuote = null,
  isDeliveryQuoteLoading = false,
  action,
}: CheckoutOrderSummaryProps) {
  const isLiveQuote = deliveryQuote?.provider === 'pidge'
  const showFreeDeliveryHint =
    !isLiveQuote &&
    totals.deliveryCharge > 0 &&
    totals.subtotal < FREE_DELIVERY_THRESHOLD

  return (
    <Card className="space-y-4 p-6 lg:self-start">
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
                {item.modifiers_snapshot.length > 0 && (
                  <p className="text-xs text-text-secondary">
                    {item.modifiers_snapshot
                      .map((mod) => mod.modifier_name)
                      .join(' · ')}
                  </p>
                )}
                <p className="text-text-secondary">
                  {item.quantity} × {formatPrice(item.unit_price)}
                </p>
              </div>
              <span className="shrink-0 font-medium text-text-primary">
                {formatPrice(item.unit_price * item.quantity)}
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
          <dd aria-live="polite">
            {isDeliveryQuoteLoading ? (
              <span className="text-text-secondary">Calculating...</span>
            ) : deliveryQuote?.isServiceable === false ? (
              <span className="text-error">Unavailable</span>
            ) : totals.deliveryCharge === 0 ? (
              'Free'
            ) : (
              formatPrice(totals.deliveryCharge)
            )}
          </dd>
        </div>

        {!isDeliveryQuoteLoading &&
          deliveryQuote?.isServiceable !== false &&
          deliveryQuote?.distanceKm != null && (
            <p className="text-xs text-text-secondary">
              {isLiveQuote
                ? 'Live rate from our delivery partner'
                : 'Based on distance from the kitchen'}
              {deliveryQuote.etaMinutes
                ? ` · arrives in about ${deliveryQuote.etaMinutes} min`
                : ''}
              {` · ${deliveryQuote.distanceKm.toFixed(1)} km`}
            </p>
          )}

        {showFreeDeliveryHint && (
          <p className="text-xs text-text-secondary">
            Free delivery on orders above{' '}
            {formatPrice(FREE_DELIVERY_THRESHOLD)}
          </p>
        )}

        {totals.discount > 0 && (
          <div className="flex items-center justify-between text-success">
            <dt>Discount</dt>
            <dd>-{formatPrice(totals.discount)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-black/5 pt-3 text-base font-semibold text-text-primary">
          <dt>Total</dt>
          <dd className="text-primary">{formatPrice(totals.total)}</dd>
        </div>
      </dl>

      {action ? <div className="pt-1">{action}</div> : null}
    </Card>
  )
}
