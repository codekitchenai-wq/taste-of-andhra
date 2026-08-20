import { useEffect, useMemo, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { StorefrontAccessGate } from '@/components/storefront/StorefrontAccessGate'
import { loadStarterOrg } from '@/services/websiteStarterService'
import {
  isWebsiteStarterTrack,
  storefrontAccessState,
  type StorefrontAccessReason,
} from '@/utils/websiteStarter'

/**
 * Gates public storefront for Website Starter orgs only.
 * Taste of Andhra / Chopsticks are unaffected (no product_track / enforcement).
 */
export function useStorefrontAccessGate(): {
  loading: boolean
  reason: StorefrontAccessReason
} {
  const org = useOrganization()
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState<StorefrontAccessReason>('ok')

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!isWebsiteStarterTrack(org.settings)) {
        if (!cancelled) {
          setReason('ok')
          setLoading(false)
        }
        return
      }

      const loaded = await loadStarterOrg(org.organizationId)
      if (cancelled) return
      if (!loaded.success) {
        setReason('ok')
        setLoading(false)
        return
      }

      setReason(
        storefrontAccessState({
          status: loaded.data.status ?? null,
          onboardingStatus: loaded.data.onboarding_status ?? null,
          settings: (loaded.data.settings as Record<string, unknown>) || org.settings,
          fssaiValidUntil: loaded.data.fssai_valid_until
            ? String(loaded.data.fssai_valid_until)
            : null,
        }),
      )
      setLoading(false)
    }

    setLoading(true)
    void run()
    return () => {
      cancelled = true
    }
  }, [org.organizationId, org.settings])

  return { loading, reason }
}

export function StorefrontGateHost({
  children,
}: {
  children: React.ReactNode
}) {
  const { loading, reason } = useStorefrontAccessGate()
  const showGate = useMemo(
    () => !loading && reason !== 'ok',
    [loading, reason],
  )

  if (loading) return <>{children}</>
  if (showGate && reason !== 'ok') {
    return <StorefrontAccessGate reason={reason} />
  }
  return <>{children}</>
}
