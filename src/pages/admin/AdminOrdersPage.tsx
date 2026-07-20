import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { OrderTable } from '@/components/admin/OrderTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { Select } from '@/components/ui/Select'
import { ORDER_STATUS, ORDER_STATUS_LIST } from '@/constants/ORDER_STATUS'
import { useAdminOrders } from '@/hooks/useAdminOrders'
import * as orderService from '@/services/orderService'
import type { OrderStatus } from '@/types/enums'

export default function AdminOrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter || undefined,
    }),
    [search, statusFilter],
  )
  const { orders, isLoading, error, refetch } = useAdminOrders(filters)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setIsUpdating(true)

    const result = await orderService.updateOrderStatus(orderId, status)

    setIsUpdating(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Order status updated')
    void refetch()
  }

  const statusOptions = [
    { label: 'All statuses', value: '' },
    ...ORDER_STATUS_LIST.map((status) => ({
      label: ORDER_STATUS[status],
      value: status,
    })),
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Orders</h2>
        <p className="mt-1 text-sm text-text-secondary">
          View and update order status across all customer orders.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <Input
            placeholder="Search by order number..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
            aria-label="Search orders"
          />
        </div>
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as OrderStatus | '')
          }
          className="md:w-56"
        />
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && orders.length === 0 && (
        <EmptyState
          title="No orders found"
          description="Try adjusting your search or filters."
        />
      )}

      {!isLoading && !error && orders.length > 0 && (
        <OrderTable
          orders={orders}
          isUpdating={isUpdating}
          onStatusChange={(orderId, status) =>
            void handleStatusChange(orderId, status)
          }
        />
      )}
    </div>
  )
}
