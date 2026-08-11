import { AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import type { OrderStatus } from '@/types/enums'
import { cn } from '@/utils/cn'

export type OrderViewFilter = 'all' | 'delayed' | OrderStatus

interface FilterButtonConfig {
  id: OrderViewFilter
  label: string
  activeVariant?: 'primary' | 'danger'
  icon?: typeof Clock
  highlightWhenCount?: boolean
}

const FILTER_BUTTONS: FilterButtonConfig[] = [
  { id: 'all', label: 'All Orders' },
  {
    id: 'pending',
    label: 'New Orders',
    activeVariant: 'primary',
    icon: Clock,
    highlightWhenCount: true,
  },
  { id: 'confirmed', label: ORDER_STATUS.confirmed },
  { id: 'preparing', label: ORDER_STATUS.preparing },
  { id: 'ready', label: ORDER_STATUS.ready },
  { id: 'out_for_delivery', label: 'Out for Delivery' },
  {
    id: 'delayed',
    label: 'Delayed',
    activeVariant: 'danger',
    icon: AlertTriangle,
    highlightWhenCount: true,
  },
  { id: 'delivered', label: ORDER_STATUS.delivered },
  { id: 'cancelled', label: ORDER_STATUS.cancelled },
]

interface OrderStatusFilterButtonsProps {
  activeFilter: OrderViewFilter
  counts: Record<OrderViewFilter, number>
  onChange: (filter: OrderViewFilter) => void
}

export function OrderStatusFilterButtons({
  activeFilter,
  counts,
  onChange,
}: OrderStatusFilterButtonsProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Filter orders by status"
    >
      {FILTER_BUTTONS.map((filter) => {
        const count = counts[filter.id] ?? 0
        const isActive = activeFilter === filter.id
        const Icon = filter.icon
        const activeVariant = filter.activeVariant ?? 'primary'

        return (
          <Button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            size="sm"
            variant={isActive ? activeVariant : 'secondary'}
            onClick={() => onChange(filter.id)}
            className={cn(
              filter.highlightWhenCount &&
                count > 0 &&
                !isActive &&
                filter.id === 'pending' &&
                'border-[#FC8019] text-[#FC8019] hover:bg-[#FC8019]/5',
              filter.highlightWhenCount &&
                count > 0 &&
                !isActive &&
                filter.id === 'delayed' &&
                'border-error text-error hover:bg-error/5',
            )}
          >
            {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
            {filter.label}
            {count > 0 ? ` (${count})` : ''}
          </Button>
        )
      })}
    </div>
  )
}
