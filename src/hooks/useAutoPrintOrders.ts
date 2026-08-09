import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import type { AdminOrder } from '@/services/orderService'
import * as printerService from '@/services/printerService'

/**
 * Auto-prints billing + kitchen tickets when orders become confirmed
 * while the kitchen board is open (app, phone, prepaid, COD).
 */
export function useAutoPrintOrders(
  orders: AdminOrder[],
  isReady = true,
): void {
  const knownConfirmedIdsRef = useRef<Set<string> | null>(null)
  const printingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isReady) return

    const confirmed = orders.filter(
      (order) => order.order_status === 'confirmed',
    )
    const confirmedIds = new Set(confirmed.map((order) => order.id))

    if (knownConfirmedIdsRef.current === null) {
      const alreadyPrinted = printerService.readPrintedOrderIds()
      knownConfirmedIdsRef.current = new Set([
        ...confirmedIds,
        ...alreadyPrinted,
      ])
      return
    }

    const known = knownConfirmedIdsRef.current
    const newlyConfirmed = confirmed.filter((order) => !known.has(order.id))

    for (const order of newlyConfirmed) {
      known.add(order.id)

      if (printingRef.current.has(order.id)) continue
      if (printerService.readPrintedOrderIds().has(order.id)) continue

      printingRef.current.add(order.id)

      void printerService
        .getPrinterSettings()
        .then(async (settingsResult) => {
          if (!settingsResult.success) return
          const settings = settingsResult.data
          if (!settings.enabled || !settings.autoPrintOnConfirm) return

          const result = await printerService.printOrderTickets(order, {
            settings,
          })

          if (!result.success) {
            toast.error(result.message)
            return
          }

          if (result.data.printed.length) {
            const labels = result.data.printed.map((type) =>
              type === 'kitchen' ? 'KOT' : 'Bill',
            )
            toast.success(`Printed ${labels.join(' + ')} for ${order.order_number}`)
          }

          if (result.data.errors.length) {
            toast.error(result.data.errors.join(' · '))
          }
        })
        .finally(() => {
          printingRef.current.delete(order.id)
        })
    }
  }, [orders, isReady])
}
