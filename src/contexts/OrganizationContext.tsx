import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { ENABLE_HOST_TENANT_RESOLUTION } from '@/constants/ARCHITECTURE_GATES'
import {
  DEFAULT_ORGANIZATION_ID,
  TASTE_OF_ANDHRA_ORG_ID,
} from '@/constants/ORGANIZATION'
import { supabase } from '@/services/supabaseClient'
import {
  customDomainHostVariants,
  isPlatformHostname,
  slugFromHostname,
} from '@/utils/tenantHost'

export interface OrganizationContextValue {
  organizationId: string
  slug: string | null
  /** True when host resolution is on and a non-default host was mapped. */
  resolvedFromHost: boolean
  isLoading: boolean
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

async function resolveOrganizationFromHostname(
  hostname: string,
): Promise<{
  organizationId: string
  slug: string | null
  resolvedFromHost: boolean
}> {
  if (!ENABLE_HOST_TENANT_RESOLUTION) {
    return {
      organizationId: DEFAULT_ORGANIZATION_ID,
      slug: null,
      resolvedFromHost: false,
    }
  }

  const host = hostname.trim().toLowerCase()
  const slug = slugFromHostname(host)

  if (slug) {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, slug, status')
      .eq('slug', slug)
      .maybeSingle()

    if (
      !error &&
      data?.id &&
      data.status !== 'suspended' &&
      data.status !== 'cancelled'
    ) {
      return {
        organizationId: data.id as string,
        slug: (data.slug as string) ?? slug,
        resolvedFromHost: data.id !== TASTE_OF_ANDHRA_ORG_ID,
      }
    }
  }

  // Custom domains are never platform subdomains of the root apex.
  if (!isPlatformHostname(host)) {
    const variants = customDomainHostVariants(host)
    const { data, error } = await supabase
      .from('organizations')
      .select('id, slug, status, custom_domain')
      .in('custom_domain', variants)
      .limit(1)

    const match = !error && Array.isArray(data) ? data[0] : null
    if (
      match?.id &&
      match.status !== 'suspended' &&
      match.status !== 'cancelled'
    ) {
      return {
        organizationId: match.id as string,
        slug: (match.slug as string) ?? null,
        resolvedFromHost: match.id !== TASTE_OF_ANDHRA_ORG_ID,
      }
    }
  }

  return {
    organizationId: DEFAULT_ORGANIZATION_ID,
    slug: slug,
    resolvedFromHost: false,
  }
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizationId, setOrganizationId] = useState<string>(
    DEFAULT_ORGANIZATION_ID,
  )
  const [slug, setSlug] = useState<string | null>(null)
  const [resolvedFromHost, setResolvedFromHost] = useState(false)
  const [isLoading, setIsLoading] = useState(ENABLE_HOST_TENANT_RESOLUTION)

  useEffect(() => {
    let cancelled = false
    const hostname =
      typeof window !== 'undefined' ? window.location.hostname : ''

    void resolveOrganizationFromHostname(hostname).then((result) => {
      if (cancelled) return
      setOrganizationId(result.organizationId)
      setSlug(result.slug)
      setResolvedFromHost(result.resolvedFromHost)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizationId,
      slug,
      resolvedFromHost,
      isLoading,
    }),
    [organizationId, slug, resolvedFromHost, isLoading],
  )

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext)
  if (!ctx) {
    return {
      organizationId: DEFAULT_ORGANIZATION_ID,
      slug: null,
      resolvedFromHost: false,
      isLoading: false,
    }
  }
  return ctx
}
