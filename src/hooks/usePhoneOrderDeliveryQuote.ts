import { useCallback, useEffect, useRef, useState } from 'react'
import * as deliveryQuoteService from '@/services/deliveryQuoteService'
import type { Address } from '@/types/Address'
import type { Branch } from '@/types/Branch'
import type { DeliveryQuote } from '@/types/DeliveryQuote'
import type { FulfillmentType } from '@/types/enums'
import {
  geocodeQuery,
  isGoogleMapsConfigured,
  loadGoogleMaps,
} from '@/utils/googleMaps'

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
 * Distance-based delivery quote for phone/counter orders.
 * Saved addresses use the checkout quote path; guest addresses geocode when
 * maps are configured, then price from the own-fleet rate card.
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
      let guestWithCoords = guestAddress
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

      if (
        !savedAddress &&
        guestWithCoords &&
        isGoogleMapsConfigured &&
        branch?.latitude != null &&
        branch?.longitude != null
      ) {
        try {
          const maps = await loadGoogleMaps()
          const query = [
            guestWithCoords.line1,
            guestWithCoords.line2,
            guestWithCoords.landmark,
            guestWithCoords.city,
            guestWithCoords.state,
            guestWithCoords.pincode,
          ]
            .filter(Boolean)
            .join(', ')
          const place = await geocodeQuery(maps, query)
          if (place) {
            guestWithCoords = {
              ...guestWithCoords,
              latitude: place.latitude,
              longitude: place.longitude,
            }
          }
        } catch {
          // Fall through to pincode / base-rate pricing without distance.
        }
      }

      if (requestIdRef.current !== requestId) return

      const result = await deliveryQuoteService.getPhoneOrderDeliveryQuote({
        savedAddress,
        guestAddress: savedAddress ? null : guestWithCoords,
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
