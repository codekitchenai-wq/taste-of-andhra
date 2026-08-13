import { PLATFORM_ROOT_DOMAIN } from '@/constants/PLATFORM'
import type { HomepageMode, TenantHomepage } from '@/types/Organization'

export interface TenantHomepageDraft {
  mode: HomepageMode
  customDomain: string
  externalUrl: string
}

const HOSTNAME_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
const LOCAL_HOSTNAME_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+localhost$/i

export function platformSubdomainUrl(slug: string): string {
  const safeSlug = slug.trim().toLowerCase()
  if (!safeSlug) return ''
  return `https://${safeSlug}.${PLATFORM_ROOT_DOMAIN}`
}

export function normalizeHostname(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '')
}

export function normalizeHomepageUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function isValidHostname(value: string): boolean {
  const host = normalizeHostname(value)
  if (!host) return false
  return HOSTNAME_PATTERN.test(host) || LOCAL_HOSTNAME_PATTERN.test(host)
}

export function isValidHomepageUrl(value: string): boolean {
  const url = normalizeHomepageUrl(value)
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function resolveTenantHomepage(
  slug: string,
  draft: TenantHomepageDraft,
): { homepage: TenantHomepage; error: string | null } {
  const mode = draft.mode

  if (mode === 'set_later') {
    return {
      homepage: emptyHomepage(),
      error: null,
    }
  }

  if (mode === 'platform_subdomain') {
    const homepageUrl = platformSubdomainUrl(slug)
    if (!homepageUrl) {
      return {
        homepage: emptyHomepage(),
        error: 'Set a URL slug before using a platform subdomain.',
      }
    }
    return {
      homepage: {
        mode,
        customDomain: null,
        homepageUrl,
      },
      error: null,
    }
  }

  if (mode === 'custom_domain') {
    const customDomain = normalizeHostname(draft.customDomain)
    if (!isValidHostname(customDomain)) {
      return {
        homepage: emptyHomepage(),
        error: 'Enter a valid domain, e.g. order.chopsticks.com',
      }
    }
    return {
      homepage: {
        mode,
        customDomain,
        homepageUrl: `https://${customDomain}`,
      },
      error: null,
    }
  }

  const homepageUrl = normalizeHomepageUrl(draft.externalUrl)
  if (!isValidHomepageUrl(homepageUrl)) {
    return {
      homepage: emptyHomepage(),
      error: 'Enter a full link, e.g. https://instagram.com/chopsticks',
    }
  }
  return {
    homepage: {
      mode: 'external_link',
      customDomain: null,
      homepageUrl,
    },
    error: null,
  }
}

export function homepageFromOrgRow(row: {
  slug?: string | null
  homepage_mode?: string | null
  custom_domain?: string | null
  homepage_url?: string | null
  settings?: Record<string, unknown> | null
}): TenantHomepage {
  const settingsHomepage = readSettingsHomepage(row.settings)
  const mode = parseHomepageMode(
    row.homepage_mode ?? settingsHomepage?.mode,
  )
  const customDomain =
    typeof row.custom_domain === 'string' && row.custom_domain.trim()
      ? normalizeHostname(row.custom_domain)
      : settingsHomepage?.customDomain ?? null
  const storedUrl =
    (typeof row.homepage_url === 'string' && row.homepage_url.trim()) ||
    settingsHomepage?.homepageUrl ||
    ''

  if (mode === 'set_later') {
    return {
      mode,
      customDomain: null,
      homepageUrl: '',
    }
  }

  if (storedUrl) {
    return {
      mode,
      customDomain: mode === 'custom_domain' ? customDomain : null,
      homepageUrl: storedUrl,
    }
  }

  if (mode === 'custom_domain' && customDomain) {
    return {
      mode,
      customDomain,
      homepageUrl: `https://${customDomain}`,
    }
  }

  return {
    mode: 'platform_subdomain',
    customDomain: null,
    homepageUrl: platformSubdomainUrl(String(row.slug ?? '')),
  }
}

export function homepageSettingsPayload(homepage: TenantHomepage) {
  return {
    mode: homepage.mode,
    custom_domain: homepage.customDomain,
    homepage_url: homepage.homepageUrl,
  }
}

export function draftFromHomepage(homepage: TenantHomepage): TenantHomepageDraft {
  return {
    mode: homepage.mode,
    customDomain: homepage.customDomain ?? '',
    externalUrl:
      homepage.mode === 'external_link' ? homepage.homepageUrl : '',
  }
}

function emptyHomepage(): TenantHomepage {
  return {
    mode: 'set_later',
    customDomain: null,
    homepageUrl: '',
  }
}

function parseHomepageMode(value: unknown): HomepageMode {
  if (
    value === 'platform_subdomain' ||
    value === 'custom_domain' ||
    value === 'external_link' ||
    value === 'set_later'
  ) {
    return value
  }
  return 'platform_subdomain'
}

function readSettingsHomepage(
  settings: Record<string, unknown> | null | undefined,
): TenantHomepage | null {
  const raw = settings?.homepage
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const homepageUrl =
    typeof record.homepage_url === 'string' ? record.homepage_url : ''
  if (!homepageUrl && record.mode !== 'custom_domain') return null
  return {
    mode: parseHomepageMode(record.mode),
    customDomain:
      typeof record.custom_domain === 'string' && record.custom_domain
        ? normalizeHostname(record.custom_domain)
        : null,
    homepageUrl,
  }
}
