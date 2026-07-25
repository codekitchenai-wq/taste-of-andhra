import { useCallback, useEffect, useRef, useState } from 'react'
import * as deliveryQuoteService from '@/services/deliveryQuoteService'
import type { Address } from '@/types/Address'
import type { DeliveryQuote } from '@/types/DeliveryQuote'

interface UseDeliveryQuoteInput {
  address: Address | null
  branchId?: string | null
  subtotal: number
  itemCount: number
}

/**
 * Fetches the shipping charge for the selected address so checkout can show it
 * before payment. Debounced because changing address, branch, or cart contents
 * all invalidate the price.
 */
export function useDeliveryQuote({
  address,
  branchId,
  subtotal,
  itemCount,
}: UseDeliveryQuoteInput) {
  const [quote, setQuote] = useState<DeliveryQuote | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Guards against a slow earlier request overwriting a newer quote.
  const requestIdRef = useRef(0)

  const fetchQuote = useCallback(async () => {
    if (!address) {
      setQuote(null)
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    setIsLoading(true)

    const result = await deliveryQuoteService.getDeliveryQuote({
      address,
      branchId,
      subtotal,
      itemCount,
    })

    if (requestIdRef.current !== requestId) return

    setQuote(result.success ? result.data : null)
    setIsLoading(false)
  }, [address, branchId, subtotal, itemCount])

  useEffect(() => {
    const timer = setTimeout(() => void fetchQuote(), 250)
    return () => clearTimeout(timer)
  }, [fetchQuote])

  return { quote, isLoading, refetch: fetchQuote }
}
