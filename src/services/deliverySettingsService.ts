import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type {
  DeliveryProvider,
  DeliverySettings,
  DeliverySettingsInput,
  ServiceAreaCheck,
} from '@/types/DeliverySettings'
import {
  FREE_DELIVERY_THRESHOLD,
  ORDER_DELIVERY_CHARGE,
} from '@/constants/ORDER'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { getCurrentOrganizationId } from '@/services/currentOrganization'
import { supabase } from '@/services/supabaseClient'
import {
  isMissingColumnError,
  withoutOrganizationId,
} from '@/utils/supabaseSchema'

/** Used before any row exists and when the settings table cannot be read. */
export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  id: 'default',
  organization_id: DEFAULT_ORGANIZATION_ID,
  branch_id: null,
  provider: 'own',
  is_enabled: false,
  service_pincodes: [],
  max_distance_km: null,
  require_location_pin: false,
  service_area_note: null,
  markup_flat: 0,
  markup_percent: 0,
  fallback_charge: ORDER_DELIVERY_CHARGE,
  per_km_charge: 0,
  free_delivery_threshold: FREE_DELIVERY_THRESHOLD,
  quote_ttl_seconds: 900,
  updated_at: new Date(0).toISOString(),
}

function mapDeliverySettings(row: Record<string, unknown>): DeliverySettings {
  return {
    id: row.id as string,
    organization_id: (row.organization_id as string) ?? DEFAULT_ORGANIZATION_ID,
    branch_id: (row.branch_id as string | null) ?? null,
    provider: (row.provider as DeliveryProvider) ?? 'own',
    is_enabled: Boolean(row.is_enabled),
    service_pincodes: (row.service_pincodes as string[] | null) ?? [],
    max_distance_km:
      row.max_distance_km != null ? Number(row.max_distance_km) : null,
    require_location_pin: Boolean(row.require_location_pin),
    service_area_note: (row.service_area_note as string | null) ?? null,
    markup_flat: Number(row.markup_flat ?? 0),
    markup_percent: Number(row.markup_percent ?? 0),
    fallback_charge: Number(row.fallback_charge ?? ORDER_DELIVERY_CHARGE),
    per_km_charge: Number(row.per_km_charge ?? 0),
    free_delivery_threshold:
      row.free_delivery_threshold != null
        ? Number(row.free_delivery_threshold)
        : null,
    quote_ttl_seconds: Number(row.quote_ttl_seconds ?? 900),
    updated_at: (row.updated_at as string) ?? new Date(0).toISOString(),
  }
}

/**
 * Branch settings override the global row. Falls back to defaults rather than
 * erroring so checkout still works before the migration is applied.
 */
export async function getDeliverySettings(
  branchId?: string | null,
): Promise<ServiceResponse<DeliverySettings>> {
  const { data, error } = await supabase
    .from('delivery_settings')
    .select('*')
    .eq('organization_id', getCurrentOrganizationId())
    .or(branchId ? `branch_id.eq.${branchId},branch_id.is.null` : 'branch_id.is.null')

  if (error) {
    return createSuccessResponse(DEFAULT_DELIVERY_SETTINGS)
  }

  const rows = (data ?? []).map(mapDeliverySettings)
  const branchRow = branchId
    ? rows.find((row) => row.branch_id === branchId)
    : undefined
  const globalRow = rows.find((row) => row.branch_id === null)

  return createSuccessResponse(
    branchRow ?? globalRow ?? DEFAULT_DELIVERY_SETTINGS,
  )
}

export async function getAllDeliverySettings(): Promise<
  ServiceResponse<DeliverySettings[]>
> {
  const { data, error } = await supabase
    .from('delivery_settings')
    .select('*')
    .eq('organization_id', getCurrentOrganizationId())
    .order('branch_id', { ascending: true, nullsFirst: true })

  if (error) {
    return createErrorResponse('Unable to load delivery settings.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapDeliverySettings))
}

function normalizePincodes(values: string[]): string[] {
  const cleaned = values
    .map((value) => value.trim())
    .filter((value) => /^\d{6}$/.test(value))

  return [...new Set(cleaned)].sort()
}

export function parsePincodeList(raw: string): {
  pincodes: string[]
  invalid: string[]
} {
  const tokens = raw
    .split(/[\s,;\n]+/)
    .map((token) => token.trim())
    .filter(Boolean)

  return {
    pincodes: normalizePincodes(tokens),
    invalid: tokens.filter((token) => !/^\d{6}$/.test(token)),
  }
}

export async function saveDeliverySettings(
  branchId: string | null,
  input: DeliverySettingsInput,
): Promise<ServiceResponse<DeliverySettings>> {
  if (input.markupPercent < 0 || input.markupPercent > 100) {
    return createErrorResponse('Markup percent must be between 0 and 100.')
  }

  if (input.fallbackCharge < 0) {
    return createErrorResponse('Base delivery charge cannot be negative.')
  }

  if (input.perKmCharge < 0) {
    return createErrorResponse('Per-km charge cannot be negative.')
  }

  if (input.maxDistanceKm !== null && input.maxDistanceKm <= 0) {
    return createErrorResponse('Max distance must be greater than zero.')
  }

  const organizationId = getCurrentOrganizationId()
  const requireLocationPin =
    input.requireLocationPin ||
    input.maxDistanceKm !== null ||
    input.perKmCharge > 0

  const payload = {
    organization_id: organizationId,
    branch_id: branchId,
    provider: input.provider,
    is_enabled: input.isEnabled,
    service_pincodes: normalizePincodes(input.servicePincodes),
    max_distance_km: input.maxDistanceKm,
    require_location_pin: requireLocationPin,
    service_area_note: input.serviceAreaNote?.trim() || null,
    markup_flat: input.markupFlat,
    markup_percent: input.markupPercent,
    fallback_charge: input.fallbackCharge,
    per_km_charge: input.perKmCharge,
    free_delivery_threshold: input.freeDeliveryThreshold,
  }

  // onConflict cannot target the partial index that guards the global row, so
  // the branch-less row is updated in place instead of upserted.
  if (branchId === null) {
    const { data: existing } = await supabase
      .from('delivery_settings')
      .select('id')
      .eq('organization_id', organizationId)
      .is('branch_id', null)
      .maybeSingle()

    let data: Record<string, unknown> | null = null
    let error: { message: string } | null = null

    if (existing) {
      const updated = await supabase
        .from('delivery_settings')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
      data = updated.data as Record<string, unknown> | null
      error = updated.error
    } else {
      const inserted = await supabase
        .from('delivery_settings')
        .insert(payload)
        .select()
        .single()
      data = inserted.data as Record<string, unknown> | null
      error = inserted.error

      if (
        error &&
        isMissingColumnError(error.message) &&
        error.message.toLowerCase().includes('organization_id')
      ) {
        const retry = await supabase
          .from('delivery_settings')
          .insert(withoutOrganizationId(payload))
          .select()
          .single()
        data = retry.data as Record<string, unknown> | null
        error = retry.error
      }
    }

    if (error) {
      return createErrorResponse(
        'Unable to save delivery settings.',
        error.message,
      )
    }

    if (!data) {
      return createErrorResponse('Unable to save delivery settings.')
    }

    return createSuccessResponse(mapDeliverySettings(data))
  }

  let { data, error } = await supabase
    .from('delivery_settings')
    .upsert(payload, { onConflict: 'branch_id' })
    .select()
    .single()

  if (
    error &&
    isMissingColumnError(error.message) &&
    error.message.toLowerCase().includes('organization_id')
  ) {
    const retry = await supabase
      .from('delivery_settings')
      .upsert(withoutOrganizationId(payload), { onConflict: 'branch_id' })
      .select()
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) {
    return createErrorResponse('Unable to save delivery settings.', error.message)
  }

  return createSuccessResponse(mapDeliverySettings(data))
}

export function isPincodeServiceable(
  pincode: string,
  settings: DeliverySettings,
): boolean {
  if (settings.service_pincodes.length === 0) return true
  return settings.service_pincodes.includes(pincode.trim())
}

/**
 * Asks the database whether an address is inside the delivery area. This is the
 * same function the orders insert guard runs, so checkout and the guard can
 * never disagree about what is deliverable.
 */
export async function checkServiceArea(
  addressId: string,
  branchId?: string | null,
): Promise<ServiceAreaCheck | null> {
  const { data, error } = await supabase.rpc('check_delivery_service_area', {
    p_address_id: addressId,
    p_branch_id: branchId ?? null,
  })

  if (error) {
    console.warn('[serviceArea] check failed:', error.message)
    return null
  }

  const row = (data as Record<string, unknown>[] | null)?.[0]

  if (!row) return null

  return {
    isServiceable: Boolean(row.is_serviceable),
    reason: (row.reason as string | null) ?? null,
    distanceKm: row.distance_km != null ? Number(row.distance_km) : null,
    maxDistanceKm:
      row.max_distance_km != null ? Number(row.max_distance_km) : null,
  }
}

function serviceAreaRules(
  settings: DeliverySettings,
  branchName?: string | null,
): string[] {
  const rules: string[] = []

  if (settings.max_distance_km !== null) {
    rules.push(
      `within ${settings.max_distance_km} km of ${branchName ?? 'the kitchen'}`,
    )
  }

  if (settings.service_pincodes.length > 0) {
    rules.push(
      `to ${settings.service_pincodes.length} pincode${
        settings.service_pincodes.length === 1 ? '' : 's'
      }`,
    )
  }

  return rules
}

/** Admin summary of every service-area rule that is currently switched on. */
export function describeServiceArea(
  settings: DeliverySettings,
  branchName?: string | null,
): string {
  const rules = serviceAreaRules(settings, branchName)

  if (rules.length === 0) {
    return 'You currently accept orders to every address.'
  }

  return `You deliver ${rules.join(' and ')}.`
}

/**
 * Customer-facing coverage line. The restaurant's own wording wins; otherwise
 * the configured rules are described, and an unrestricted area says nothing.
 */
export function serviceAreaNotice(
  settings: DeliverySettings,
  branchName?: string | null,
): string | null {
  if (settings.service_area_note) return settings.service_area_note

  const rules = serviceAreaRules(settings, branchName)

  if (rules.length === 0) return null

  return `We deliver ${rules.join(' and ')}.`
}
