import type { OrderFullDetails } from '@/types/Order'
import { PAYMENT_METHOD } from '@/constants/PAYMENT_METHOD'
import { PAYMENT_STATUS } from '@/constants/PAYMENT_STATUS'
import { formatAddressLine } from '@/utils/mapAddress'
import { formatPrice, formatDateTimeFull } from '@/utils/format'

interface OrderDetailsPanelProps {
  order: OrderFullDetails
}

export function OrderDetailsPanel({ order }: OrderDetailsPanelProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
        <h3 className="font-semibold text-text-primary">Order Items</h3>
        <ul className="mt-4 divide-y divide-black/5">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-medium text-text-primary">
                  {item.dish?.name ?? 'Dish'}
                </p>
                <p className="text-sm text-text-secondary">
                  {item.quantity} × {formatPrice(item.price)}
                </p>
              </div>
              <span className="font-medium text-text-primary">
                {formatPrice(item.total)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
        <h3 className="font-semibold text-text-primary">Delivery Address</h3>
        {order.address ? (
          <div className="mt-3 text-sm text-text-secondary">
            <p className="font-medium text-text-primary">
              {order.address.full_name}
            </p>
            <p className="mt-1">{formatAddressLine(order.address)}</p>
            <p className="mt-1">{order.address.phone}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">
            Address not available.
          </p>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
        <h3 className="font-semibold text-text-primary">Payment</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary">Method</dt>
            <dd className="text-text-primary">
              {PAYMENT_METHOD[order.payment_method]}
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

      <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-md">
        <h3 className="font-semibold text-text-primary">Order Summary</h3>
        <dl className="mt-3 space-y-2 text-sm">
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
          <div className="flex justify-between gap-4 border-t border-black/5 pt-3 text-base font-semibold text-text-primary">
            <dt>Total</dt>
            <dd className="text-primary">
              {formatPrice(order.total)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-text-secondary">
          Placed on {formatDateTimeFull(new Date(order.created_at))}
        </p>
        {order.special_instructions && (
          <p className="mt-3 rounded-[var(--radius-input)] bg-background p-3 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Note: </span>
            {order.special_instructions}
          </p>
        )}
      </section>
    </div>
  )
}
