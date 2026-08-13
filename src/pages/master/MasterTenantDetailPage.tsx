import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MenuCsvImport } from '@/components/master/MenuCsvImport'
import { OnboardingPack } from '@/components/master/OnboardingPack'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ROUTES } from '@/constants/ROUTES'
import { listMasterOrganizations } from '@/services/entitlementService'
import { supabase } from '@/services/supabaseClient'
import type { MasterOrganizationSummary } from '@/types/Organization'

export default function MasterTenantDetailPage() {
  const { orgId = '' } = useParams()
  const [org, setOrg] = useState<MasterOrganizationSummary | null>(null)
  const [ownerEmail, setOwnerEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const list = await listMasterOrganizations()
      if (cancelled) return
      if (!list.success) {
        setError(list.message)
        setLoading(false)
        return
      }
      const match = list.data.find((item) => item.id === orgId) ?? null
      setOrg(match)
      if (!match) {
        setError('Restaurant not found.')
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('organizations')
        .select('email')
        .eq('id', orgId)
        .maybeSingle()
      if (!cancelled) {
        setOwnerEmail(String(data?.email ?? ''))
        setError(null)
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [orgId])

  if (loading) return <LoadingState variant="inline" />
  if (error || !org) {
    return (
      <ErrorState
        title="Tenant not found"
        message={error ?? 'Unknown restaurant.'}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">{org.name}</h1>
        <p className="mt-1 font-mono text-sm text-text-secondary">
          {org.slug} · {org.status}
          {org.subscription_active ? ' · subscription active' : ' · subscription inactive'}
        </p>
      </div>

      <OnboardingPack
        restaurantName={org.name}
        ownerEmail={ownerEmail}
        existingUser
      />

      <MenuCsvImport organizationId={org.id} />

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          to={ROUTES.MASTER.featuresForOrg(org.id)}
          className="text-primary hover:underline"
        >
          Manage features
        </Link>
        <Link to={ROUTES.MASTER.TENANTS} className="text-primary hover:underline">
          Back to tenants
        </Link>
        <Link to={ROUTES.MASTER.ONBOARD} className="text-primary hover:underline">
          Onboard another restaurant
        </Link>
      </div>
    </div>
  )
}
