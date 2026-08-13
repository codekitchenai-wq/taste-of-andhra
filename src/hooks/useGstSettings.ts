import { useEffect, useState } from 'react'
import {
  DEFAULT_GST_SETTINGS,
  type GstSettings,
} from '@/constants/GST'
import * as settingsService from '@/services/settingsService'

export function useGstSettings() {
  const [settings, setSettings] = useState<GstSettings>(DEFAULT_GST_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void settingsService.getGstSettings().then((result) => {
      if (cancelled) return
      if (result.success) setSettings(result.data)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { settings, isLoading }
}
