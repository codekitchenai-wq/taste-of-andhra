import type { OrderStatus } from '@/types/enums'

const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled']

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

export function addMinutesToIso(
  from: string | Date,
  minutes: number,
): string {
  const base = typeof from === 'string' ? new Date(from) : from
  return new Date(base.getTime() + minutes * 60_000).toISOString()
}

export function getRemainingMs(
  estimatedDelivery: string | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  if (!estimatedDelivery) return null
  const target = new Date(estimatedDelivery).getTime()
  if (Number.isNaN(target)) return null
  return target - nowMs
}

export function isOrderDelayed(input: {
  estimated_delivery: string | null | undefined
  order_status: OrderStatus
}, nowMs: number = Date.now()): boolean {
  if (isTerminalOrderStatus(input.order_status)) return false
  const remaining = getRemainingMs(input.estimated_delivery, nowMs)
  return remaining !== null && remaining < 0
}

function formatDuration(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds)
  const hours = Math.floor(abs / 3600)
  const minutes = Math.floor((abs % 3600) / 60)
  const seconds = abs % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }
  return `${seconds}s`
}

export interface EtaDisplay {
  /** Short label for badges, e.g. "32m left" or "Overdue 12m" */
  shortLabel: string
  /** Customer-facing sentence */
  customerLabel: string
  isDelayed: boolean
  /** True when order is delivered/cancelled or no ETA set */
  isInactive: boolean
}

export function getEtaDisplay(
  estimatedDelivery: string | null | undefined,
  orderStatus: OrderStatus,
  nowMs: number = Date.now(),
): EtaDisplay {
  if (isTerminalOrderStatus(orderStatus)) {
    return {
      shortLabel: orderStatus === 'delivered' ? 'Delivered' : 'Cancelled',
      customerLabel:
        orderStatus === 'delivered'
          ? 'Your order has been delivered.'
          : 'This order was cancelled.',
      isDelayed: false,
      isInactive: true,
    }
  }

  const remaining = getRemainingMs(estimatedDelivery, nowMs)

  if (remaining === null) {
    return {
      shortLabel: 'ETA pending',
      customerLabel: 'Delivery time will appear once confirmed.',
      isDelayed: false,
      isInactive: true,
    }
  }

  const totalSeconds = Math.round(remaining / 1000)
  const duration = formatDuration(totalSeconds)

  if (totalSeconds < 0) {
    return {
      shortLabel: `Overdue ${duration}`,
      customerLabel: `Running late · expected ${duration} ago`,
      isDelayed: true,
      isInactive: false,
    }
  }

  return {
    shortLabel: `${duration} left`,
    customerLabel: `Arriving in about ${duration}`,
    isDelayed: false,
    isInactive: false,
  }
}
