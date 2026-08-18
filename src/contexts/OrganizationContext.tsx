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
  UNMATCHED_ORGANIZATION_ID,
} from '@/constants/ORGANIZATION'
import { setCurrentOrganizationId } from '@/services/currentOrganization'
import { supabase } from '@/services/supabaseClient'
import { organizationSlugCandidates } from '@/constants/TENANTS'
import { isMissingColumnError } from '@/utils/supabaseSchema'
import { storefrontWhatsAppEnabledFromSettings, whatsappOtpLoginEnabledFromSettings } from '@/utils/tenantFeatures'
import {
  customDomainHostVariants,
  isPlatformHostname,
  resolveTenantSlugFromLocation,
} from '@/utils/tenantHost'

export interface OrganizationContextValue {
  organizationId: string
  slug: string | null
  name: string | null
  tagline: string | null
  description: string | null
  phone: string | null
  alternatePhone: string | null
  email: string | null
  address: string | null
  weekdayHours: string | null
  weekendHours: string | null
  branding: Record<string, unknown>
  settings: Record<string, unknown>
  /** Admin-controlled storefront click-to-WhatsApp. Off for new restaurants. */
  storefrontWhatsAppEnabled: boolean
  setStorefrontWhatsAppEnabled: (enabled: boolean) => void
  /** Admin-controlled customer WhatsApp OTP login. Off for new restaurants. */
  whatsappOtpLoginEnabled: boolean
  setWhatsAppOtpLoginEnabled: (enabled: boolean) => void
  /** True when host resolution is on and a non-default host was mapped. */
  resolvedFromHost: boolean
  isLoading: boolean
}

type ResolvedOrganization = Omit<
  OrganizationContextValue,
  | 'isLoading'
  | 'setStorefrontWhatsAppEnabled'
  | 'setWhatsAppOtpLoginEnabled'
>

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

const FULL_ORG_SELECT =
  'id, slug, name, status, tagline, description, phone, email, address, branding, opening_hours, settings'
const MIN_ORG_SELECT = 'id, slug, name, status'

function isUsableOrg(row: { id?: unknown; status?: unknown } | null): boolean {
  return Boolean(
    row?.id && row.status !== 'suspended' && row.status !== 'cancelled',
  )
}

function hoursFrom(data: Record<string, unknown>) {
  const hours =
    data.opening_hours && typeof data.opening_hours === 'object'
      ? (data.opening_hours as Record<string, unknown>)
      : {}
  const settings =
    data.settings && typeof data.settings === 'object'
      ? (data.settings as Record<string, unknown>)
      : {}
  const alternate =
    typeof settings.alternate_phone === 'string'
      ? settings.alternate_phone
      : null

  return {
    weekdayHours:
      typeof hours.weekdays === 'string' ? hours.weekdays : null,
    weekendHours:
      typeof hours.weekends === 'string' ? hours.weekends : null,
    alternatePhone: alternate,
    email: typeof data.email === 'string' ? data.email : null,
  }
}

function fromRow(
  data: Record<string, unknown>,
  slug: string | null,
  resolved: boolean,
): ResolvedOrganization {
  const branding =
    data.branding && typeof data.branding === 'object'
      ? (data.branding as Record<string, unknown>)
      : {}
  const settings =
    data.settings && typeof data.settings === 'object'
      ? (data.settings as Record<string, unknown>)
      : {}
  const extra = hoursFrom(data)
  const organizationId = data.id as string
  const resolvedSlug = (data.slug as string) ?? slug
  return {
    organizationId,
    slug: resolvedSlug,
    name: (data.name as string) ?? null,
    tagline: (data.tagline as string) ?? null,
    description: (data.description as string) ?? null,
    phone: (data.phone as string) ?? null,
    alternatePhone: extra.alternatePhone,
    email: extra.email,
    address: (data.address as string) ?? null,
    weekdayHours: extra.weekdayHours,
    weekendHours: extra.weekendHours,
    branding,
    settings,
    storefrontWhatsAppEnabled: storefrontWhatsAppEnabledFromSettings(settings, {
      slug: resolvedSlug,
      organizationId,
    }),
    whatsappOtpLoginEnabled: whatsappOtpLoginEnabledFromSettings(settings, {
      slug: resolvedSlug,
      organizationId,
    }),
    resolvedFromHost: resolved,
  }
}

async function fetchOrgBySlug(slug: string): Promise<Record<string, unknown> | null> {
  const candidates = organizationSlugCandidates(slug)

  for (const candidate of candidates) {
    const full = await supabase
      .from('organizations')
      .select(FULL_ORG_SELECT)
      .eq('slug', candidate)
      .maybeSingle()

    if (!full.error && isUsableOrg(full.data)) {
      return full.data as Record<string, unknown>
    }

    if (full.error && isMissingColumnError(full.error.message)) {
      const mini = await supabase
        .from('organizations')
        .select(MIN_ORG_SELECT)
        .eq('slug', candidate)
        .maybeSingle()

      if (!mini.error && isUsableOrg(mini.data)) {
        return mini.data as Record<string, unknown>
      }
    }
  }

  return null
}

function emptyResolved(overrides: Partial<ResolvedOrganization> = {}): ResolvedOrganization {
  const base: ResolvedOrganization = {
    organizationId: DEFAULT_ORGANIZATION_ID,
    slug: null,
    name: null,
    tagline: null,
    description: null,
    phone: null,
    alternatePhone: null,
    email: null,
    address: null,
    weekdayHours: null,
    weekendHours: null,
    branding: {},
    settings: {},
    storefrontWhatsAppEnabled: false,
    whatsappOtpLoginEnabled: false,
    resolvedFromHost: false,
    ...overrides,
  }
  return {
    ...base,
    storefrontWhatsAppEnabled:
      overrides.storefrontWhatsAppEnabled ??
      storefrontWhatsAppEnabledFromSettings(base.settings, {
        slug: base.slug,
        organizationId: base.organizationId,
      }),
    whatsappOtpLoginEnabled:
      overrides.whatsappOtpLoginEnabled ??
      whatsappOtpLoginEnabledFromSettings(base.settings, {
        slug: base.slug,
        organizationId: base.organizationId,
      }),
  }
}

async function resolveOrganizationFromHostname(
  hostname: string,
): Promise<ResolvedOrganization> {
  const empty = emptyResolved()

  if (!ENABLE_HOST_TENANT_RESOLUTION) {
    return empty
  }

  const host = hostname.trim().toLowerCase()
  const slug = resolveTenantSlugFromLocation({
    hostname: host,
    persist: true,
  })

  if (slug) {
    const row = await fetchOrgBySlug(slug)
    if (row) {
      return fromRow(row, slug, row.id !== TASTE_OF_ANDHRA_ORG_ID)
    }

    return emptyResolved({
      organizationId: UNMATCHED_ORGANIZATION_ID,
      slug,
      resolvedFromHost: true,
      storefrontWhatsAppEnabled: false,
      whatsappOtpLoginEnabled: false,
    })
  }

  if (!isPlatformHostname(host)) {
    const variants = customDomainHostVariants(host)
    const full = await supabase
      .from('organizations')
      .select(`${FULL_ORG_SELECT}, custom_domain`)
      .in('custom_domain', variants)
      .limit(1)

    const match =
      !full.error && Array.isArray(full.data) ? full.data[0] : null

    if (isUsableOrg(match)) {
      return fromRow(
        match as Record<string, unknown>,
        (match as { slug?: string }).slug ?? null,
        (match as { id: string }).id !== TASTE_OF_ANDHRA_ORG_ID,
      )
    }
  }

  return emptyResolved({ slug })
}

function displayNameFromSlug(slug: string | null): string | null {
  if (!slug) return null
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function initialSlugFromLocation(): string | null {
  if (!ENABLE_HOST_TENANT_RESOLUTION) return null
  if (typeof window === 'undefined') return null
  return resolveTenantSlugFromLocation({ persist: true })
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizationId, setOrganizationId] = useState<string>(() => {
    const slug = initialSlugFromLocation()
    const id = slug ? UNMATCHED_ORGANIZATION_ID : DEFAULT_ORGANIZATION_ID
    setCurrentOrganizationId(id)
    return id
  })
  const [slug, setSlug] = useState<string | null>(() => initialSlugFromLocation())
  const [name, setName] = useState<string | null>(() =>
    displayNameFromSlug(initialSlugFromLocation()),
  )
  const [tagline, setTagline] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [alternatePhone, setAlternatePhone] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [weekdayHours, setWeekdayHours] = useState<string | null>(null)
  const [weekendHours, setWeekendHours] = useState<string | null>(null)
  const [branding, setBranding] = useState<Record<string, unknown>>({})
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [storefrontWhatsAppEnabled, setStorefrontWhatsAppEnabled] = useState(
    () =>
      storefrontWhatsAppEnabledFromSettings({}, {
        slug: initialSlugFromLocation(),
        organizationId: initialSlugFromLocation()
          ? UNMATCHED_ORGANIZATION_ID
          : DEFAULT_ORGANIZATION_ID,
      }),
  )
  const [whatsappOtpLoginEnabled, setWhatsAppOtpLoginEnabled] = useState(
    () =>
      whatsappOtpLoginEnabledFromSettings({}, {
        slug: initialSlugFromLocation(),
        organizationId: initialSlugFromLocation()
          ? UNMATCHED_ORGANIZATION_ID
          : DEFAULT_ORGANIZATION_ID,
      }),
  )
  const [resolvedFromHost, setResolvedFromHost] = useState(
    () => Boolean(initialSlugFromLocation()),
  )
  const [isLoading, setIsLoading] = useState(ENABLE_HOST_TENANT_RESOLUTION)

  useEffect(() => {
    let cancelled = false
    const hostname =
      typeof window !== 'undefined' ? window.location.hostname : ''

    const applyResolved = (result: ResolvedOrganization) => {
      if (cancelled) return
      setCurrentOrganizationId(result.organizationId)
      setOrganizationId(result.organizationId)
      setSlug(result.slug)
      setName(result.name)
      setTagline(result.tagline)
      setDescription(result.description)
      setPhone(result.phone)
      setAlternatePhone(result.alternatePhone)
      setEmail(result.email)
      setAddress(result.address)
      setWeekdayHours(result.weekdayHours)
      setWeekendHours(result.weekendHours)
      setBranding(result.branding)
      setSettings(result.settings)
      setStorefrontWhatsAppEnabled(result.storefrontWhatsAppEnabled)
      setWhatsAppOtpLoginEnabled(result.whatsappOtpLoginEnabled)
      setResolvedFromHost(result.resolvedFromHost)
      setIsLoading(false)
    }

    // Do not leave the homepage on skeletons if host lookup hangs.
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) setIsLoading(false)
    }, 2500)

    void resolveOrganizationFromHostname(hostname)
      .then(applyResolved)
      .catch(() => {
        if (!cancelled) setIsLoading(false)
      })
      .finally(() => {
        window.clearTimeout(timeoutId)
      })

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [])

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizationId,
      slug,
      name,
      tagline,
      description,
      phone,
      alternatePhone,
      email,
      address,
      weekdayHours,
      weekendHours,
      branding,
      settings,
      storefrontWhatsAppEnabled,
      setStorefrontWhatsAppEnabled,
      whatsappOtpLoginEnabled,
      setWhatsAppOtpLoginEnabled,
      resolvedFromHost,
      isLoading,
    }),
    [
      organizationId,
      slug,
      name,
      tagline,
      description,
      phone,
      alternatePhone,
      email,
      address,
      weekdayHours,
      weekendHours,
      branding,
      settings,
      storefrontWhatsAppEnabled,
      whatsappOtpLoginEnabled,
      resolvedFromHost,
      isLoading,
    ],
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
      name: null,
      tagline: null,
      description: null,
      phone: null,
      alternatePhone: null,
      email: null,
      address: null,
      weekdayHours: null,
      weekendHours: null,
      branding: {},
      settings: {},
      storefrontWhatsAppEnabled: storefrontWhatsAppEnabledFromSettings(
        {},
        { organizationId: DEFAULT_ORGANIZATION_ID },
      ),
      setStorefrontWhatsAppEnabled: () => undefined,
      whatsappOtpLoginEnabled: whatsappOtpLoginEnabledFromSettings(
        {},
        { organizationId: DEFAULT_ORGANIZATION_ID },
      ),
      setWhatsAppOtpLoginEnabled: () => undefined,
      resolvedFromHost: false,
      isLoading: false,
    }
  }
  return ctx
}
