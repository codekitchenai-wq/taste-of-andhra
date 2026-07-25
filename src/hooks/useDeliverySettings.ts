import { useEffect, useState } from 'react'
import * as deliverySettingsService from '@/services/deliverySettingsService'
import type { DeliverySettings } from '@/types/DeliverySettings'

/**
 * Reads the delivery rules that apply to a branch. Public data, so it is safe
 * to show the service area before a customer picks an address.
 */
export function useDeliverySettings(branchId?: string | null) {
  const [settings, setSettings] = useState<DeliverySettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    void deliverySettingsService.getDeliverySettings(branchId).then((result) => {
      if (cancelled) return
      setSettings(result.success ? result.data : null)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [branchId])

  return { settings, isLoading }
}
