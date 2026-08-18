import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import { DEFAULT_ETA_MINUTES } from '@/constants/ORDER'
import { getCurrentOrganizationId } from '@/services/currentOrganization'
import { supabase } from '@/services/supabaseClient'
import type { StoreOperatingHours } from '@/types/StoreHours'
import type { OrderNumberSequenceSettings } from '@/types/OrderNumberSequence'
import { isMissingColumnError } from '@/utils/supabaseSchema'
import {
  createDefaultStoreHours,
  parseStoreOperatingHours,
  validateStoreOperatingHours,
} from '@/utils/storeHours'
import {
  normalizeOrderPrefix,
  parseOrderNumberSequence,
  validateOrderNumberSequence,
} from '@/utils/orderNumber'
import { GST_SETTINGS_KEY, type GstSettings } from '@/constants/GST'
import {
  isValidGstin,
  normalizeGstin,
  parseGstSettings,
} from '@/utils/gstSettings'
import {
  defaultOrderNumberSequence,
  restaurantDisplayName,
  STOREFRONT_WHATSAPP_SETTING_KEY,
  storefrontWhatsAppEnabledFromSettings,
  WHATSAPP_OTP_LOGIN_SETTING_KEY,
  whatsappOtpLoginEnabledFromSettings,
} from '@/utils/tenantFeatures'

const DEFAULT_ETA_KEY = 'default_eta_minutes'
const UPI_VPA_KEY = 'upi_vpa'
const UPI_PAYEE_NAME_KEY = 'upi_payee_name'
const STORE_HOURS_KEY = 'store_operating_hours'
const ORDER_NUMBER_SEQUENCE_KEY = 'order_number_sequence'

function orderNumberSequenceKey(branchId?: string | null): string {
  if (!branchId) return ORDER_NUMBER_SEQUENCE_KEY
  return `${ORDER_NUMBER_SEQUENCE_KEY}__${branchId}`
}

export interface UpiSettings {
  vpa: string
  payeeName: string
}

function parseEtaMinutes(raw: string | null | undefined): number {
  const value = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(value) || value < 5 || value > 240) {
    return DEFAULT_ETA_MINUTES
  }
  return value
}

export async function getDefaultEtaMinutes(): Promise<
  ServiceResponse<number>
> {
  const withOrg = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', DEFAULT_ETA_KEY)
    .eq('organization_id', getCurrentOrganizationId())
    .maybeSingle()

  if (
    withOrg.error &&
    isMissingColumnError(withOrg.error.message) &&
    withOrg.error.message.toLowerCase().includes('organization_id')
  ) {
    const legacy = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', DEFAULT_ETA_KEY)
      .maybeSingle()

    if (legacy.error) {
      if (legacy.error.message.toLowerCase().includes('app_settings')) {
        return createSuccessResponse(DEFAULT_ETA_MINUTES)
      }
      return createErrorResponse(
        'Unable to load delivery time settings.',
        legacy.error.message,
      )
    }

    return createSuccessResponse(
      parseEtaMinutes(legacy.data?.value as string | undefined),
    )
  }

  if (withOrg.error) {
    if (withOrg.error.message.toLowerCase().includes('app_settings')) {
      return createSuccessResponse(DEFAULT_ETA_MINUTES)
    }
    return createErrorResponse(
      'Unable to load delivery time settings.',
      withOrg.error.message,
    )
  }

  return createSuccessResponse(
    parseEtaMinutes(withOrg.data?.value as string | undefined),
  )
}

export async function setDefaultEtaMinutes(
  minutes: number,
): Promise<ServiceResponse<number>> {
  const next = Math.round(minutes)

  if (!Number.isFinite(next) || next < 5 || next > 240) {
    return createErrorResponse(
      'Default delivery time must be between 5 and 240 minutes.',
    )
  }

  let { error } = await supabase.from('app_settings').upsert(
    {
      organization_id: getCurrentOrganizationId(),
      key: DEFAULT_ETA_KEY,
      value: String(next),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,key' },
  )

  if (
    error &&
    isMissingColumnError(error.message) &&
    error.message.toLowerCase().includes('organization_id')
  ) {
    const legacy = await supabase.from('app_settings').upsert(
      {
        key: DEFAULT_ETA_KEY,
        value: String(next),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )
    error = legacy.error
  }

  if (error) {
    return createErrorResponse(
      'Unable to save delivery time settings.',
      error.message,
    )
  }

  return createSuccessResponse(next)
}

async function getSettingValue(key: string): Promise<string | null> {
  const withOrg = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .eq('organization_id', getCurrentOrganizationId())
    .maybeSingle()

  if (
    withOrg.error &&
    isMissingColumnError(withOrg.error.message) &&
    withOrg.error.message.toLowerCase().includes('organization_id')
  ) {
    const legacy = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()

    if (legacy.error) return null
    return (legacy.data?.value as string | undefined) ?? null
  }

  if (withOrg.error) return null
  return (withOrg.data?.value as string | undefined) ?? null
}

async function setSettingValue(
  key: string,
  value: string,
): Promise<ServiceResponse<string>> {
  let { error } = await supabase.from('app_settings').upsert(
    {
      organization_id: getCurrentOrganizationId(),
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,key' },
  )

  if (
    error &&
    isMissingColumnError(error.message) &&
    error.message.toLowerCase().includes('organization_id')
  ) {
    const legacy = await supabase.from('app_settings').upsert(
      {
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )
    error = legacy.error
  }

  if (error) {
    return createErrorResponse('Unable to save settings.', error.message)
  }

  return createSuccessResponse(value)
}

async function loadCurrentRestaurant(): Promise<{
  name: string | null
  slug: string | null
  settings: Record<string, unknown>
}> {
  const { data } = await supabase
    .from('organizations')
    .select('name, slug, settings')
    .eq('id', getCurrentOrganizationId())
    .maybeSingle()

  const settings =
    data?.settings && typeof data.settings === 'object'
      ? (data.settings as Record<string, unknown>)
      : {}

  return {
    name: typeof data?.name === 'string' ? data.name : null,
    slug: typeof data?.slug === 'string' ? data.slug : null,
    settings,
  }
}

export async function getUpiSettings(): Promise<ServiceResponse<UpiSettings>> {
  const envVpa = import.meta.env.VITE_UPI_VPA?.trim() ?? ''
  const envName = import.meta.env.VITE_UPI_PAYEE_NAME?.trim() ?? ''
  const org = await loadCurrentRestaurant()
  const fallbackName = restaurantDisplayName({
    name: org.name,
    slug: org.slug,
    organizationId: getCurrentOrganizationId(),
  })

  const [vpaRaw, nameRaw] = await Promise.all([
    getSettingValue(UPI_VPA_KEY),
    getSettingValue(UPI_PAYEE_NAME_KEY),
  ])

  return createSuccessResponse({
    vpa: (vpaRaw?.trim() || envVpa || '').trim(),
    payeeName: (nameRaw?.trim() || envName || fallbackName).trim(),
  })
}

export async function setUpiSettings(
  input: UpiSettings,
): Promise<ServiceResponse<UpiSettings>> {
  const org = await loadCurrentRestaurant()
  const fallbackName = restaurantDisplayName({
    name: org.name,
    slug: org.slug,
    organizationId: getCurrentOrganizationId(),
  })
  const vpa = input.vpa.trim()
  const payeeName = input.payeeName.trim() || fallbackName

  if (vpa && !vpa.includes('@')) {
    return createErrorResponse('Enter a valid UPI ID (e.g. restaurant@upi).')
  }

  const [vpaResult, nameResult] = await Promise.all([
    setSettingValue(UPI_VPA_KEY, vpa),
    setSettingValue(UPI_PAYEE_NAME_KEY, payeeName),
  ])

  if (!vpaResult.success) return vpaResult
  if (!nameResult.success) return nameResult

  return createSuccessResponse({ vpa, payeeName })
}

export async function getStorefrontWhatsAppEnabled(): Promise<
  ServiceResponse<boolean>
> {
  const org = await loadCurrentRestaurant()
  return createSuccessResponse(
    storefrontWhatsAppEnabledFromSettings(org.settings, {
      slug: org.slug,
      organizationId: getCurrentOrganizationId(),
    }),
  )
}

export async function setStorefrontWhatsAppEnabled(
  enabled: boolean,
): Promise<ServiceResponse<boolean>> {
  const orgId = getCurrentOrganizationId()
  const org = await loadCurrentRestaurant()
  const nextSettings = {
    ...org.settings,
    [STOREFRONT_WHATSAPP_SETTING_KEY]: enabled,
  }

  const { error } = await supabase
    .from('organizations')
    .update({ settings: nextSettings })
    .eq('id', orgId)

  if (error) {
    return createErrorResponse(
      'Unable to save WhatsApp storefront setting.',
      error.message,
    )
  }

  return createSuccessResponse(enabled)
}

export async function getWhatsAppOtpLoginEnabled(): Promise<
  ServiceResponse<boolean>
> {
  const org = await loadCurrentRestaurant()
  return createSuccessResponse(
    whatsappOtpLoginEnabledFromSettings(org.settings, {
      slug: org.slug,
      organizationId: getCurrentOrganizationId(),
    }),
  )
}

export async function setWhatsAppOtpLoginEnabled(
  enabled: boolean,
): Promise<ServiceResponse<boolean>> {
  const orgId = getCurrentOrganizationId()
  const org = await loadCurrentRestaurant()
  const nextSettings = {
    ...org.settings,
    [WHATSAPP_OTP_LOGIN_SETTING_KEY]: enabled,
  }

  const { error } = await supabase
    .from('organizations')
    .update({ settings: nextSettings })
    .eq('id', orgId)

  if (error) {
    return createErrorResponse(
      'Unable to save WhatsApp login setting.',
      error.message,
    )
  }

  return createSuccessResponse(enabled)
}

export async function getStoreOperatingHours(): Promise<
  ServiceResponse<StoreOperatingHours>
> {
  const raw = await getSettingValue(STORE_HOURS_KEY)
  const parsed = parseStoreOperatingHours(raw)
  return createSuccessResponse(parsed ?? createDefaultStoreHours())
}

export async function setStoreOperatingHours(
  hours: StoreOperatingHours,
): Promise<ServiceResponse<StoreOperatingHours>> {
  const validationError = validateStoreOperatingHours(hours)
  if (validationError) {
    return createErrorResponse(validationError)
  }

  const normalized: StoreOperatingHours = {
    timezone: hours.timezone.trim() || createDefaultStoreHours().timezone,
    schedule: hours.schedule,
    overrides: [...hours.overrides].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  }

  const result = await setSettingValue(
    STORE_HOURS_KEY,
    JSON.stringify(normalized),
  )
  if (!result.success) {
    return createErrorResponse(
      'Unable to save store timings.',
      result.error ?? result.message,
    )
  }

  return createSuccessResponse(normalized)
}

export async function getOrderNumberSequence(
  branchId?: string | null,
): Promise<ServiceResponse<OrderNumberSequenceSettings>> {
  const org = await loadCurrentRestaurant()
  const fallback = defaultOrderNumberSequence({ slug: org.slug })

  if (branchId) {
    const branchRaw = await getSettingValue(orderNumberSequenceKey(branchId))
    const branchParsed = parseOrderNumberSequence(branchRaw)
    if (branchParsed) {
      return createSuccessResponse(branchParsed)
    }
  }

  const globalRaw = await getSettingValue(ORDER_NUMBER_SEQUENCE_KEY)
  const globalParsed = parseOrderNumberSequence(globalRaw)
  return createSuccessResponse(globalParsed ?? fallback)
}

export async function setOrderNumberSequence(
  branchId: string | null,
  settings: OrderNumberSequenceSettings,
): Promise<ServiceResponse<OrderNumberSequenceSettings>> {
  const normalized: OrderNumberSequenceSettings = {
    prefix: normalizeOrderPrefix(settings.prefix),
    includeDate: Boolean(settings.includeDate),
  }

  const validationError = validateOrderNumberSequence(normalized)
  if (validationError) {
    return createErrorResponse(validationError)
  }

  const result = await setSettingValue(
    orderNumberSequenceKey(branchId),
    JSON.stringify(normalized),
  )
  if (!result.success) {
    return createErrorResponse(
      'Unable to save order number sequence.',
      result.error ?? result.message,
    )
  }

  return createSuccessResponse(normalized)
}

export async function getGstSettings(): Promise<ServiceResponse<GstSettings>> {
  const raw = await getSettingValue(GST_SETTINGS_KEY)
  return createSuccessResponse(parseGstSettings(raw))
}

export async function setGstSettings(
  settings: GstSettings,
): Promise<ServiceResponse<GstSettings>> {
  const gstin = settings.gstin ? normalizeGstin(settings.gstin) : ''

  if (gstin && !isValidGstin(gstin)) {
    return createErrorResponse(
      'Enter a valid 15-character GSTIN, or leave it blank.',
    )
  }

  if (settings.enabled && !gstin) {
    return createErrorResponse(
      'Add your GSTIN to enable GST invoices, or turn GST off.',
    )
  }

  const normalized: GstSettings = {
    enabled: Boolean(settings.enabled),
    gstin,
  }

  const saveResult = await setSettingValue(
    GST_SETTINGS_KEY,
    JSON.stringify(normalized),
  )
  if (!saveResult.success) {
    return createErrorResponse(
      'Unable to save GST settings.',
      saveResult.error ?? saveResult.message,
    )
  }

  return createSuccessResponse(normalized)
}
