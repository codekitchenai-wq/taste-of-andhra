import { useMemo, useState } from 'react'
import { AdminOrderDetailModal } from '@/components/admin/AdminOrderDetailModal'
import { OnamOrdersBoard } from '@/components/admin/OnamOrdersBoard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import { useOrganization } from '@/contexts/OrganizationContext'
import {
  useAdminOnamOrders,
  type OnamOrdersDateFilter,
} from '@/hooks/useAdminOnamOrders'
import { isSpiceMalabarStorefront } from '@/utils/storefrontCopy'
import {
  onamCelebrationDateKey,
  onamDateLabelFromKey,
  onamPlatesFromOrder,
} from '@/utils/onamOrder'
import { cn } from '@/utils/cn'

type PaymentFilter = 'all' | 'pending' | 'paid'

export default function AdminOnamOrdersPage() {
  const org = useOrganization()
  const showOnam = org.isLoading || isSpiceMalabarStorefront(org)
  const [selectedDate, setSelectedDate] = useState<OnamOrdersDateFilter>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null)

  const { onamOrders, isLoading, error, refetch } =
    useAdminOnamOrders(selectedDate)

  const ordersForDay = useMemo(() => {
    if (selectedDate === 'all') return onamOrders
    return onamOrders.filter(
      (order) => onamCelebrationDateKey(order.estimated_delivery) === selectedDate,
    )
  }, [onamOrders, selectedDate])

  const visibleOrders = useMemo(() => {
    if (paymentFilter === 'all') return ordersForDay
    return ordersForDay.filter((order) => order.payment_status === paymentFilter)
  }, [ordersForDay, paymentFilter])

  const summary = useMemo(() => {
    return {
      orders: visibleOrders.length,
      plates: visibleOrders.reduce(
        (sum, order) => sum + onamPlatesFromOrder(order),
        0,
      ),
      paid: visibleOrders.filter((order) => order.payment_status === 'paid')
        .length,
      pending: visibleOrders.filter((order) => order.payment_status === 'pending')
        .length,
    }
  }, [visibleOrders])

  if (!showOnam) {
    return (
      <EmptyState
        title="Onam Sadhya bookings"
        description="This view is available for Chopstick Spice Malabar during the Onam offer."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-card)] bg-surface p-4 shadow-sm md:p-5">
        <p className="text-sm text-text-secondary">
          Pre-booked Onam Sadhya orders from{' '}
          <span className="font-medium text-text-primary">/onam</span>, grouped
          by celebration day and delivery slot. Payment shows whether the
          customer has paid online or via UPI link.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={selectedDate === 'all' ? 'primary' : 'secondary'}
            onClick={() => setSelectedDate('all')}
          >
            All days
          </Button>
          {ONAM_SADHYA.dates.map((date) => (
            <Button
              key={date.value}
              type="button"
              size="sm"
              variant={selectedDate === date.value ? 'primary' : 'secondary'}
              onClick={() => setSelectedDate(date.value)}
            >
              {date.label}
            </Button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              { id: 'all', label: 'All payments' },
              { id: 'pending', label: 'Payment pending' },
              { id: 'paid', label: 'Paid' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPaymentFilter(option.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                paymentFilter === option.id
                  ? 'bg-primary text-white'
                  : 'bg-background text-text-secondary hover:text-primary',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-[var(--radius-button)] bg-background px-3 py-2">
            <p className="text-xs text-text-secondary">Orders</p>
            <p className="text-lg font-semibold tabular-nums">{summary.orders}</p>
          </div>
          <div className="rounded-[var(--radius-button)] bg-background px-3 py-2">
            <p className="text-xs text-text-secondary">Plates</p>
            <p className="text-lg font-semibold tabular-nums">{summary.plates}</p>
          </div>
          <div className="rounded-[var(--radius-button)] bg-background px-3 py-2">
            <p className="text-xs text-text-secondary">Paid</p>
            <p className="text-lg font-semibold tabular-nums text-success">
              {summary.paid}
            </p>
          </div>
          <div className="rounded-[var(--radius-button)] bg-background px-3 py-2">
            <p className="text-xs text-text-secondary">Awaiting payment</p>
            <p className="text-lg font-semibold tabular-nums text-warning">
              {summary.pending}
            </p>
          </div>
        </div>

        {selectedDate !== 'all' ? (
          <p className="mt-3 text-sm font-medium text-text-primary">
            Showing {onamDateLabelFromKey(selectedDate)}
          </p>
        ) : null}
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && ordersForDay.length === 0 && (
        <EmptyState
          title="No Onam pre-bookings yet"
          description="Orders placed from the Onam Sadhya page will appear here by celebration date and delivery slot."
        />
      )}

      {!isLoading && !error && ordersForDay.length > 0 && visibleOrders.length === 0 && (
        <EmptyState
          title="No orders for this payment filter"
          description="Try All payments to see every Onam pre-booking."
        />
      )}

      {!isLoading && !error && visibleOrders.length > 0 && (
        <OnamOrdersBoard
          orders={visibleOrders}
          paymentFilter="all"
          onView={setViewingOrderId}
        />
      )}

      <AdminOrderDetailModal
        orderId={viewingOrderId}
        onClose={() => setViewingOrderId(null)}
        onStatusUpdated={() => void refetch({ silent: true })}
      />
    </div>
  )
}
