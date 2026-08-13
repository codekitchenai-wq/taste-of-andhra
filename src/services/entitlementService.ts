import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type {
  EntitlementSource,
  MasterOrganizationSummary,
  OrgFeatureState,
  OrganizationStatus,
  SetOrgFeatureCode,
  SetOrgFeatureResult,
} from '@/types/Organization'
import {
  dependentClosure,
  isCoreFeature,
  requirementClosure,
} from '@/constants/FEATURES'
import { isMissingColumnError } from '@/utils/supabaseSchema'
import { homepageFromOrgRow } from '@/utils/tenantHomepage'
import { supabase } from '@/services/supabaseClient'

type OrgListRow = {
  id: string
  name: string
  slug: string
  status: OrganizationStatus
  homepage_mode?: string | null
  custom_domain?: string | null
  homepage_url?: string | null
  settings?: Record<string, unknown> | null
}

function isMissingRpc(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('does not exist') ||
    lower.includes('could not find the function') ||
    lower.includes('schema cache')
  )
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function mapFeatureState(row: Record<string, unknown>): OrgFeatureState {
  return {
    feature_key: String(row.feature_key ?? ''),
    name: String(row.name ?? row.feature_key ?? ''),
    description: (row.description as string | null) ?? null,
    is_add_on: Boolean(row.is_add_on),
    is_core: Boolean(row.is_core) || isCoreFeature(String(row.feature_key ?? '')),
    default_enabled: Boolean(row.default_enabled),
    display_order: Number(row.display_order ?? 0),
    enabled: Boolean(row.enabled),
    source: (row.source as OrgFeatureState['source']) ?? null,
    requires: asStringArray(row.requires),
    enabled_dependents: asStringArray(row.enabled_dependents),
  }
}

function mapSetResult(value: unknown): SetOrgFeatureResult {
  let row: Record<string, unknown> = {}
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      if (parsed && typeof parsed === 'object') {
        row = parsed as Record<string, unknown>
      }
    } catch {
      row = {}
    }
  } else if (value && typeof value === 'object') {
    row = value as Record<string, unknown>
  }

  const code = row.code
  return {
    ok: Boolean(row.ok),
    feature_key: String(row.feature_key ?? ''),
    enabled: Boolean(row.enabled),
    changed: asStringArray(row.changed),
    already_set: asStringArray(row.already_set),
    blocked_by: asStringArray(row.blocked_by),
    code:
      code === 'CORE_FEATURE' || code === 'DEPENDENTS_ENABLED'
        ? (code as SetOrgFeatureCode)
        : undefined,
    message: typeof row.message === 'string' ? row.message : undefined,
  }
}

function isEntitled(
  key: string,
  catalog: Array<{ key: string; default_enabled: boolean }>,
  entitlements: Map<string, { enabled: boolean; source: EntitlementSource | null }>,
): boolean {
  const row = entitlements.get(key)
  if (row) return row.enabled
  const feature = catalog.find((item) => item.key === key)
  if (feature?.default_enabled || isCoreFeature(key)) return true
  return false
}

export async function listMasterOrganizations(): Promise<
  ServiceResponse<MasterOrganizationSummary[]>
> {
  const { data, error } = await supabase
    .from('organizations')
    .select(
      'id, name, slug, status, homepage_mode, custom_domain, homepage_url, settings',
    )
    .order('name', { ascending: true })

  if (error) {
    if (isMissingColumnError(error.message)) {
      return listMasterOrganizationsWithoutHomepage()
    }
    if (isMissingRpc(error.message) || error.message.includes('organizations')) {
      return createErrorResponse(
        'Restaurant list is not available yet. Apply the SaaS migrations in Supabase.',
        error.message,
      )
    }
    return createErrorResponse(
      'Unable to load restaurants.',
      error.message,
    )
  }

  const rows = (data ?? []) as OrgListRow[]

  const withSubscription = await Promise.all(
    rows.map(async (org) => {
      const { data: active } = await supabase.rpc('org_subscription_active', {
        target_org_id: org.id,
      })
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        subscription_active: Boolean(active),
        homepage: homepageFromOrgRow(org),
      } satisfies MasterOrganizationSummary
    }),
  )

  return createSuccessResponse(withSubscription)
}

async function listMasterOrganizationsWithoutHomepage(): Promise<
  ServiceResponse<MasterOrganizationSummary[]>
> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, status, settings')
    .order('name', { ascending: true })

  if (error) {
    return createErrorResponse(
      'Unable to load restaurants.',
      error.message,
    )
  }

  const rows = (data ?? []) as OrgListRow[]
  const withSubscription = await Promise.all(
    rows.map(async (org) => {
      const { data: active } = await supabase.rpc('org_subscription_active', {
        target_org_id: org.id,
      })
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        subscription_active: Boolean(active),
        homepage: homepageFromOrgRow(org),
      } satisfies MasterOrganizationSummary
    }),
  )

  return createSuccessResponse(withSubscription)
}

async function getOrgFeatureStatesFromTables(
  organizationId: string,
): Promise<ServiceResponse<OrgFeatureState[]>> {
  const [featuresResult, entitlementsResult] = await Promise.all([
    supabase
      .from('features')
      .select('key, name, description, is_add_on, default_enabled, display_order')
      .order('display_order', { ascending: true }),
    supabase
      .from('organization_entitlements')
      .select('feature_key, enabled, source')
      .eq('organization_id', organizationId),
  ])

  if (featuresResult.error) {
    return createErrorResponse(
      `Unable to load restaurant features. ${featuresResult.error.message}`,
      featuresResult.error.message,
    )
  }
  if (entitlementsResult.error) {
    return createErrorResponse(
      `Unable to load restaurant features. ${entitlementsResult.error.message}`,
      entitlementsResult.error.message,
    )
  }

  const catalog = (featuresResult.data ?? []) as Array<{
    key: string
    name: string
    description: string | null
    is_add_on: boolean
    default_enabled: boolean
    display_order: number
  }>

  const entitlements = new Map<
    string,
    { enabled: boolean; source: EntitlementSource | null }
  >()
  for (const row of entitlementsResult.data ?? []) {
    entitlements.set(String(row.feature_key), {
      enabled: Boolean(row.enabled),
      source: (row.source as EntitlementSource | null) ?? null,
    })
  }

  const states: OrgFeatureState[] = catalog.map((feature) => {
    const requires = [...(requirementClosure(feature.key).filter((key) => key !== feature.key))]
    const enabled = isEntitled(feature.key, catalog, entitlements)
    const enabledDependents = dependentClosure(feature.key).filter((key) =>
      isEntitled(key, catalog, entitlements),
    )
    return {
      feature_key: feature.key,
      name: feature.name,
      description: feature.description,
      is_add_on: feature.is_add_on,
      is_core: isCoreFeature(feature.key),
      default_enabled: feature.default_enabled,
      display_order: feature.display_order,
      enabled,
      source: entitlements.get(feature.key)?.source ?? null,
      requires,
      enabled_dependents: enabledDependents,
    }
  })

  return createSuccessResponse(states)
}

async function upsertEntitlement(
  organizationId: string,
  featureKey: string,
  enabled: boolean,
  source: EntitlementSource,
  notes: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('organization_entitlements').upsert(
    {
      organization_id: organizationId,
      feature_key: featureKey,
      enabled,
      source,
      notes,
    },
    { onConflict: 'organization_id,feature_key' },
  )
  return { error: error?.message ?? null }
}

async function setOrgFeatureFromTables(
  organizationId: string,
  featureKey: string,
  enabled: boolean,
  cascade: boolean,
): Promise<ServiceResponse<SetOrgFeatureResult>> {
  const current = await getOrgFeatureStatesFromTables(organizationId)
  if (!current.success) return current

  const catalog = current.data
  const target = catalog.find((item) => item.feature_key === featureKey)
  if (!target) {
    return createErrorResponse(`Unknown feature: ${featureKey}`)
  }

  const entitled = new Set(
    catalog.filter((item) => item.enabled).map((item) => item.feature_key),
  )

  if (enabled) {
    const required = requirementClosure(featureKey)
    const changed: string[] = []
    const alreadySet: string[] = []

    for (const key of required) {
      if (entitled.has(key)) {
        alreadySet.push(key)
        continue
      }
      const source: EntitlementSource = key === featureKey ? 'manual' : 'addon'
      const notes =
        key === featureKey ? 'Master toggle' : `Required by ${featureKey}`
      const result = await upsertEntitlement(
        organizationId,
        key,
        true,
        source,
        notes,
      )
      if (result.error) {
        return createErrorResponse(result.error)
      }
      changed.push(key)
    }

    return createSuccessResponse({
      ok: true,
      feature_key: featureKey,
      enabled: true,
      changed,
      already_set: alreadySet,
      message:
        changed.length > 1
          ? 'Feature enabled with required modules'
          : changed.length === 1
            ? 'Feature enabled'
            : 'Already enabled',
    })
  }

  if (isCoreFeature(featureKey)) {
    return createSuccessResponse({
      ok: false,
      feature_key: featureKey,
      enabled: true,
      changed: [],
      already_set: [],
      code: 'CORE_FEATURE',
      message: `${target.name} is a core module and cannot be turned off`,
    })
  }

  const enabledDependents = dependentClosure(featureKey).filter((key) =>
    entitled.has(key),
  )
  if (enabledDependents.length > 0 && !cascade) {
    return createSuccessResponse({
      ok: false,
      feature_key: featureKey,
      enabled: true,
      changed: [],
      already_set: [],
      blocked_by: enabledDependents,
      code: 'DEPENDENTS_ENABLED',
      message: 'Turn off dependent features first, or confirm cascade',
    })
  }

  const toDisable = [featureKey, ...enabledDependents]
  const changed: string[] = []
  const alreadySet: string[] = []

  for (const key of toDisable) {
    if (isCoreFeature(key)) continue
    if (!entitled.has(key)) {
      alreadySet.push(key)
      continue
    }
    const notes =
      key === featureKey ? 'Master toggle' : `Disabled with ${featureKey}`
    const result = await upsertEntitlement(
      organizationId,
      key,
      false,
      'manual',
      notes,
    )
    if (result.error) {
      return createErrorResponse(result.error)
    }
    changed.push(key)
  }

  return createSuccessResponse({
    ok: true,
    feature_key: featureKey,
    enabled: false,
    changed,
    already_set: alreadySet,
    message:
      changed.length > 1
        ? 'Feature and dependents disabled'
        : 'Feature disabled',
  })
}

export async function getOrgFeatureStates(
  organizationId: string,
): Promise<ServiceResponse<OrgFeatureState[]>> {
  const { data, error } = await supabase.rpc('get_org_feature_states', {
    target_org_id: organizationId,
  })

  if (!error) {
    const rows = Array.isArray(data) ? data : []
    return createSuccessResponse(
      rows.map((row) => mapFeatureState(row as Record<string, unknown>)),
    )
  }

  if (isMissingRpc(error.message)) {
    return getOrgFeatureStatesFromTables(organizationId)
  }

  return createErrorResponse(
    `Unable to load restaurant features. ${error.message}`,
    error.message,
  )
}

export async function setOrgFeature(
  organizationId: string,
  featureKey: string,
  enabled: boolean,
  cascade = false,
): Promise<ServiceResponse<SetOrgFeatureResult>> {
  const { data, error } = await supabase.rpc('set_org_feature', {
    target_org_id: organizationId,
    p_feature_key: featureKey,
    p_enabled: enabled,
    p_cascade: cascade,
  })

  if (!error) {
    return createSuccessResponse(mapSetResult(data))
  }

  if (isMissingRpc(error.message)) {
    return setOrgFeatureFromTables(organizationId, featureKey, enabled, cascade)
  }

  return createErrorResponse(
    error.message || 'Unable to update feature.',
    error.message,
  )
}
