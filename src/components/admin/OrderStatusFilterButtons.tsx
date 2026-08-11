import { AlertTriangle, Clock, Radio } from 'lucide-react'
import { ORDER_STATUS } from '@/constants/ORDER_STATUS'
import type { OrderStatus } from '@/types/enums'
import { cn } from '@/utils/cn'
import { ORDER_STATUS_FILTER_ACTIVE_STYLES } from '@/utils/orderStatusStyles'

export type OrderViewFilter = 'active' | 'all' | 'delayed' | OrderStatus

interface FilterButtonConfig {
  id: OrderViewFilter
  label: string
  icon?: typeof Clock
  highlightWhenCount?: boolean
  /** Custom active styles when selected (non-status filters). */
  activeClassName?: string
  idleHighlightClassName?: string
}

const FILTER_BUTTONS: FilterButtonConfig[] = [
  {
    id: 'active',
    label: 'Active orders',
    icon: Radio,
    activeClassName:
      'border-transparent bg-primary text-white hover:bg-primary-dark',
  },
  {
    id: 'pending',
    label: 'New Orders',
    icon: Clock,
    highlightWhenCount: true,
    idleHighlightClassName:
      'border-[#1C1917] text-[#1C1917] hover:bg-[#1C1917]/5',
  },
  { id: 'confirmed', label: ORDER_STATUS.confirmed },
  { id: 'preparing', label: ORDER_STATUS.preparing },
  { id: 'ready', label: ORDER_STATUS.ready },
  { id: 'out_for_delivery', label: 'Out for Delivery' },
  {
    id: 'delayed',
    label: 'Delayed',
    icon: AlertTriangle,
    highlightWhenCount: true,
    activeClassName: 'border-transparent bg-error text-white hover:bg-error/90',
    idleHighlightClassName: 'border-error text-error hover:bg-error/5',
  },
  { id: 'delivered', label: ORDER_STATUS.delivered },
  { id: 'cancelled', label: ORDER_STATUS.cancelled },
  {
    id: 'all',
    label: 'All in range',
    activeClassName:
      'border-transparent bg-text-primary text-white hover:bg-text-primary/90',
  },
]

interface OrderStatusFilterButtonsProps {
  activeFilter: OrderViewFilter
  counts: Record<OrderViewFilter, number>
  onChange: (filter: OrderViewFilter) => void
}

function isOrderStatus(id: OrderViewFilter): id is OrderStatus {
  return (
    id === 'pending' ||
    id === 'confirmed' ||
    id === 'preparing' ||
    id === 'ready' ||
    id === 'out_for_delivery' ||
    id === 'delivered' ||
    id === 'cancelled'
  )
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

        return (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter.id)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-button)] border-2 px-3 text-sm font-medium transition-colors',
              isActive
                ? isOrderStatus(filter.id)
                  ? ORDER_STATUS_FILTER_ACTIVE_STYLES[filter.id]
                  : (filter.activeClassName ??
                    'border-transparent bg-primary text-white')
                : cn(
                    'border-black/10 bg-surface text-text-primary hover:bg-black/5',
                    filter.highlightWhenCount &&
                      count > 0 &&
                      filter.idleHighlightClassName,
                  ),
            )}
          >
            {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
            {filter.label}
            {count > 0 ? ` (${count})` : ''}
          </button>
        )
      })}
    </div>
  )
}
