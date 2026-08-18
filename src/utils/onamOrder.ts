import { ONAM_SADHYA } from '@/constants/ONAM_SADHYA'
import type { AdminOrder } from '@/services/orderService'
import { onamSlotLabel } from '@/utils/onamPrebook'

const ONAM_NOTE_MARKER = 'ONAM SADHYA PRE-BOOK'

const ONAM_DISH_NAMES = [
  ONAM_SADHYA.services.parcel.dishName,
  ONAM_SADHYA.services.dine_in.dishName,
]

export function isOnamOrder(order: {
  special_instructions?: string | null
  items?: { name: string }[]
}): boolean {
  if (order.special_instructions?.includes(ONAM_NOTE_MARKER)) return true
  return (
    order.items?.some((item) =>
      ONAM_DISH_NAMES.some(
        (name) => item.name.toLowerCase() === name.toLowerCase(),
      ),
    ) ?? false
  )
}

export function onamPlatesFromOrder(order: AdminOrder): number {
  return order.items
    .filter((item) => item.name.toLowerCase().includes('onam sadhya'))
    .reduce((sum, item) => sum + item.quantity, 0)
}

/** YYYY-MM-DD in Asia/Kolkata for grouping by celebration day. */
export function onamCelebrationDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** HH:mm in Asia/Kolkata — matches onam pre-book slot values. */
export function onamSlotValueFromEstimated(
  iso: string | null | undefined,
): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  return `${hour}:${minute}`
}

export function onamSlotLabelFromEstimated(iso: string | null | undefined): string {
  const slot = onamSlotValueFromEstimated(iso)
  if (!slot) return 'No slot'
  return onamSlotLabel(slot) ?? slot
}

export interface OnamSlotGroup {
  slotValue: string
  slotLabel: string
  orders: AdminOrder[]
  totalPlates: number
  paidOrders: number
  pendingPaymentOrders: number
}

export function groupOnamOrdersBySlot(orders: AdminOrder[]): OnamSlotGroup[] {
  const bySlot = new Map<string, AdminOrder[]>()

  for (const order of orders) {
    const slot = onamSlotValueFromEstimated(order.estimated_delivery) ?? 'unknown'
    const list = bySlot.get(slot) ?? []
    list.push(order)
    bySlot.set(slot, list)
  }

  return [...bySlot.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slotValue, slotOrders]) => ({
      slotValue,
      slotLabel:
        slotValue === 'unknown'
          ? 'No slot'
          : onamSlotLabel(slotValue) ?? slotValue,
      orders: slotOrders,
      totalPlates: slotOrders.reduce(
        (sum, order) => sum + onamPlatesFromOrder(order),
        0,
      ),
      paidOrders: slotOrders.filter((order) => order.payment_status === 'paid')
        .length,
      pendingPaymentOrders: slotOrders.filter(
        (order) => order.payment_status === 'pending',
      ).length,
    }))
}

export function onamDateLabelFromKey(dateKey: string): string {
  return (
    ONAM_SADHYA.dates.find((row) => row.value === dateKey)?.label ?? dateKey
  )
}
