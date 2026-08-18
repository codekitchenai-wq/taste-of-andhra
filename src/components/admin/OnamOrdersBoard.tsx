import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge'
import { OrderNumberDisplay } from '@/components/orders/OrderNumberDisplay'
import { PAYMENT_METHOD } from '@/constants/PAYMENT_METHOD'
import { PAYMENT_STATUS } from '@/constants/PAYMENT_STATUS'
import type { AdminOrder } from '@/services/orderService'
import type { PaymentStatus } from '@/types/enums'
import { formatPrice } from '@/utils/format'
import {
  groupOnamOrdersBySlot,
  onamPlatesFromOrder,
  type OnamSlotGroup,
} from '@/utils/onamOrder'
import { cn } from '@/utils/cn'

interface OnamOrdersBoardProps {
  orders: AdminOrder[]
  paymentFilter: 'all' | PaymentStatus
  onView: (orderId: string) => void
}

function paymentBadge(order: AdminOrder) {
  if (order.payment_status === 'paid') {
    return <Badge variant="veg">Paid</Badge>
  }
  if (order.payment_status === 'pending') {
    if (order.payment_claimed_at) {
      return <Badge variant="warning">UPI claimed</Badge>
    }
    return <Badge variant="warning">Payment pending</Badge>
  }
  return (
    <Badge variant="unavailable">{PAYMENT_STATUS[order.payment_status]}</Badge>
  )
}

function SlotSection({
  group,
  onView,
}: {
  group: OnamSlotGroup
  onView: (orderId: string) => void
}) {
  return (
    <section className="rounded-[var(--radius-card)] bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-4 py-3 md:px-5">
        <div>
          <h3 className="font-heading text-lg font-semibold text-text-primary">
            {group.slotLabel}
          </h3>
          <p className="mt-0.5 text-sm text-text-secondary">
            {group.totalPlates} plate{group.totalPlates === 1 ? '' : 's'} ·{' '}
            {group.orders.length} order{group.orders.length === 1 ? '' : 's'} ·{' '}
            {group.paidOrders} paid · {group.pendingPaymentOrders} awaiting
            payment
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-black/5 bg-background/60">
            <tr>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Plates</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Payment</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">View</th>
            </tr>
          </thead>
          <tbody>
            {group.orders.map((order) => (
              <tr
                key={order.id}
                className={cn(
                  'border-b border-black/5 last:border-b-0',
                  order.payment_status === 'pending' && 'bg-warning/5',
                )}
              >
                <td className="px-4 py-3 font-medium">
                  <OrderNumberDisplay value={order.order_number} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-text-primary">
                    {order.customer_name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {order.customer_phone || order.customer_email || '—'}
                  </p>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {onamPlatesFromOrder(order)}
                </td>
                <td className="px-4 py-3 font-medium">
                  {formatPrice(order.total)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {paymentBadge(order)}
                    <span className="text-xs text-text-secondary">
                      {PAYMENT_METHOD[order.payment_method]}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={order.order_status} />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onView(order.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
                    aria-label={`View ${order.order_number}`}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function OnamOrdersBoard({
  orders,
  paymentFilter,
  onView,
}: OnamOrdersBoardProps) {
  const filtered =
    paymentFilter === 'all'
      ? orders
      : orders.filter((order) => order.payment_status === paymentFilter)

  const groups = groupOnamOrdersBySlot(filtered)

  if (groups.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <SlotSection key={group.slotValue} group={group} onView={onView} />
      ))}
    </div>
  )
}
