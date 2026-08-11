import type { OrderFullDetails } from '@/types/Order'
import { OrderPaymentQr } from '@/components/orders/OrderPaymentQr'
import { PAYMENT_METHOD } from '@/constants/PAYMENT_METHOD'
import { PAYMENT_STATUS } from '@/constants/PAYMENT_STATUS'
import { formatAddressLine } from '@/utils/mapAddress'
import { formatGuestAddress } from '@/utils/mapOrder'
import { formatPrice, formatDateTimeFull } from '@/utils/format'
import { cn } from '@/utils/cn'

interface OrderDetailsPanelProps {
  order: OrderFullDetails
  onOrderUpdated?: (order: OrderFullDetails) => void
  /** Denser layout for admin modals */
  compact?: boolean
}

export function OrderDetailsPanel({
  order,
  onOrderUpdated,
  compact = false,
}: OrderDetailsPanelProps) {
  const guestAddress = formatGuestAddress(order)
  const sectionClass = cn(
    'rounded-[var(--radius-card)] bg-surface shadow-md',
    compact ? 'p-3' : 'p-5',
  )
  const stackClass = compact ? 'space-y-3' : 'space-y-6'
  const headingClass = cn(
    'font-semibold text-text-primary',
    compact && 'text-sm',
  )

  return (
    <div className={stackClass}>
      <section className={sectionClass}>
        <h3 className={headingClass}>Order Items</h3>
        <ul className={cn('divide-y divide-black/5', compact ? 'mt-2' : 'mt-4')}>
          {order.items.map((item) => (
            <li
              key={item.id}
              className={cn(
                'flex items-start justify-between gap-4 first:pt-0 last:pb-0',
                compact ? 'py-2' : 'py-3',
              )}
            >
              <div>
                <p
                  className={cn(
                    'font-medium text-text-primary',
                    compact && 'text-sm',
                  )}
                >
                  {item.dish_name_snapshot ?? item.dish?.name ?? 'Dish'}
                </p>
                {item.modifiers_snapshot.length > 0 && (
                  <p className="text-xs text-text-secondary">
                    {item.modifiers_snapshot
                      .map((mod) => mod.modifier_name)
                      .join(' · ')}
                  </p>
                )}
                <p className="text-sm text-text-secondary">
                  {item.quantity} × {formatPrice(item.price)}
                </p>
              </div>
              <span
                className={cn(
                  'font-medium text-text-primary',
                  compact && 'text-sm',
                )}
              >
                {formatPrice(item.total)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={sectionClass}>
        <h3 className={headingClass}>
          {order.fulfillment_type === 'pickup' ? 'Pickup' : 'Delivery Address'}
        </h3>
        {(order.guest_name || order.guest_phone) && (
          <div
            className={cn(
              'text-sm text-text-secondary',
              compact ? 'mt-2' : 'mt-3',
            )}
          >
            <p className="font-medium text-text-primary">
              {order.guest_name ?? 'Guest'}
              {order.order_source === 'phone' ? ' · Phone / Counter' : ''}
            </p>
            {order.guest_phone && <p className="mt-1">{order.guest_phone}</p>}
          </div>
        )}
        {order.fulfillment_type === 'pickup' ? (
          <p
            className={cn(
              'text-sm text-text-secondary',
              compact ? 'mt-2' : 'mt-3',
            )}
          >
            Customer will collect from the restaurant.
          </p>
        ) : order.address ? (
          <div
            className={cn(
              'text-sm text-text-secondary',
              compact ? 'mt-2' : 'mt-3',
            )}
          >
            <p className="font-medium text-text-primary">
              {order.address.full_name}
            </p>
            <p className="mt-1">{formatAddressLine(order.address)}</p>
            <p className="mt-1">{order.address.phone}</p>
          </div>
        ) : guestAddress ? (
          <div
            className={cn(
              'text-sm text-text-secondary',
              compact ? 'mt-2' : 'mt-3',
            )}
          >
            <p className="mt-1">{guestAddress}</p>
          </div>
        ) : (
          <p
            className={cn(
              'text-sm text-text-secondary',
              compact ? 'mt-2' : 'mt-3',
            )}
          >
            Address not available.
          </p>
        )}
      </section>

      <section className={sectionClass}>
        <h3 className={headingClass}>Payment</h3>
        <dl className={cn('space-y-2 text-sm', compact ? 'mt-2' : 'mt-3')}>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Method</dt>
            <dd className="text-text-primary">
              {PAYMENT_METHOD[order.payment_method] ?? order.payment_method}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Payment Status</dt>
            <dd className="text-text-primary">
              {PAYMENT_STATUS[order.payment_status]}
            </dd>
          </div>
          {order.payment && (
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Amount</dt>
              <dd className="text-text-primary">
                {formatPrice(order.payment.amount)}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <OrderPaymentQr order={order} onMarkedPaid={onOrderUpdated} />

      <section className={sectionClass}>
        <h3 className={headingClass}>Order Summary</h3>
        <dl className={cn('space-y-2 text-sm', compact ? 'mt-2' : 'mt-3')}>
          <div className="flex justify-between gap-4 text-text-secondary">
            <dt>Subtotal</dt>
            <dd>{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-text-secondary">
            <dt>Tax</dt>
            <dd>{formatPrice(order.tax)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-text-secondary">
            <dt>Delivery</dt>
            <dd>
              {order.delivery_charge === 0
                ? 'Free'
                : formatPrice(order.delivery_charge)}
            </dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between gap-4 text-text-secondary">
              <dt>Discount</dt>
              <dd>-{formatPrice(order.discount)}</dd>
            </div>
          )}
          <div
            className={cn(
              'flex justify-between gap-4 border-t border-black/5 font-semibold text-text-primary',
              compact ? 'pt-2 text-sm' : 'pt-3 text-base',
            )}
          >
            <dt>Total</dt>
            <dd className="text-primary">{formatPrice(order.total)}</dd>
          </div>
        </dl>
        <p
          className={cn(
            'text-xs text-text-secondary',
            compact ? 'mt-2' : 'mt-4',
          )}
        >
          Placed on {formatDateTimeFull(new Date(order.created_at))}
        </p>
        {order.special_instructions && (
          <p
            className={cn(
              'rounded-[var(--radius-input)] bg-background text-sm text-text-secondary',
              compact ? 'mt-2 p-2' : 'mt-3 p-3',
            )}
          >
            <span className="font-medium text-text-primary">Note: </span>
            {order.special_instructions}
          </p>
        )}
      </section>
    </div>
  )
}
