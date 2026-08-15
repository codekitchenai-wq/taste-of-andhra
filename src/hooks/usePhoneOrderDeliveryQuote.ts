import { useCallback, useEffect, useRef, useState } from 'react'
import * as deliveryQuoteService from '@/services/deliveryQuoteService'
import type { Address } from '@/types/Address'
import type { Branch } from '@/types/Branch'
import type { DeliveryQuote } from '@/types/DeliveryQuote'
import type { FulfillmentType } from '@/types/enums'

interface GuestAddressFields {
  line1: string
  line2: string
  landmark: string
  city: string
  state: string
  pincode: string
}

interface UsePhoneOrderDeliveryQuoteInput {
  enabled: boolean
  fulfillmentType: FulfillmentType
  savedAddress: Address | null
  guestAddress: GuestAddressFields | null
  branch: Branch | null
  subtotal: number
  itemCount: number
}

/**
 * Delivery quote for phone/counter orders.
 * Saved addresses use the checkout quote path (distance when pinned).
 * Guest addresses use the rate card (pincode + optional coords later).
 */
export function usePhoneOrderDeliveryQuote({
  enabled,
  fulfillmentType,
  savedAddress,
  guestAddress,
  branch,
  subtotal,
  itemCount,
}: UsePhoneOrderDeliveryQuoteInput) {
  const [quote, setQuote] = useState<DeliveryQuote | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const requestIdRef = useRef(0)

  const fetchQuote = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (!enabled || fulfillmentType !== 'delivery') {
      setQuote(null)
      setIsLoading(false)
      return
    }

    if (!savedAddress && !guestAddress) {
      setQuote(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const guestPayload = guestAddress
        ? {
            line1: guestAddress.line1,
            line2: guestAddress.line2 || undefined,
            landmark: guestAddress.landmark || undefined,
            city: guestAddress.city,
            state: guestAddress.state,
            pincode: guestAddress.pincode,
            latitude: null as number | null,
            longitude: null as number | null,
          }
        : null

      const result = await deliveryQuoteService.getPhoneOrderDeliveryQuote({
        savedAddress,
        guestAddress: savedAddress ? null : guestPayload,
        branchId: branch?.id ?? null,
        branchLatitude: branch?.latitude ?? null,
        branchLongitude: branch?.longitude ?? null,
        subtotal,
        itemCount,
      })

      if (requestIdRef.current !== requestId) return

      setQuote(result.success ? result.data : null)
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false)
      }
    }
  }, [
    enabled,
    fulfillmentType,
    savedAddress,
    guestAddress,
    branch,
    subtotal,
    itemCount,
  ])

  useEffect(() => {
    const timer = setTimeout(() => void fetchQuote(), 300)
    return () => clearTimeout(timer)
  }, [fetchQuote])

  return { quote, isLoading, refetch: fetchQuote }
}
