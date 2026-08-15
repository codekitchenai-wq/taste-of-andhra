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
import { PLATFORM_ROOT_DOMAIN } from '@/constants/PLATFORM'
import { supabase } from '@/services/supabaseClient'

export interface OrganizationContextValue {
  organizationId: string
  slug: string | null
  /** True when host resolution is on and a non-default host was mapped. */
  resolvedFromHost: boolean
  isLoading: boolean
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

function slugFromHostname(hostname: string): string | null {
  const host = hostname.toLowerCase()
  const root = PLATFORM_ROOT_DOMAIN.toLowerCase()
  if (host === root || host === `www.${root}` || host === 'localhost') {
    return null
  }
  if (host.endsWith(`.${root}`)) {
    const slug = host.slice(0, -(root.length + 1))
    if (!slug || slug.includes('.')) return null
    return slug
  }
  return null
}

async function resolveOrganizationId(
  slug: string | null,
): Promise<{ organizationId: string; resolvedFromHost: boolean }> {
  if (!ENABLE_HOST_TENANT_RESOLUTION || !slug) {
    return {
      organizationId: DEFAULT_ORGANIZATION_ID,
      resolvedFromHost: false,
    }
  }

  const { data, error } = await supabase
    .from('organizations')
    .select('id, slug, status')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data?.id) {
    return {
      organizationId: DEFAULT_ORGANIZATION_ID,
      resolvedFromHost: false,
    }
  }

  if (data.status === 'suspended' || data.status === 'cancelled') {
    return {
      organizationId: DEFAULT_ORGANIZATION_ID,
      resolvedFromHost: false,
    }
  }

  return {
    organizationId: data.id as string,
    resolvedFromHost: data.id !== TASTE_OF_ANDHRA_ORG_ID,
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
    const hostSlug =
      typeof window !== 'undefined'
        ? slugFromHostname(window.location.hostname)
        : null
    setSlug(hostSlug)

    void resolveOrganizationId(hostSlug).then((result) => {
      if (cancelled) return
      setOrganizationId(result.organizationId)
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
