import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import {
  DEFAULT_TRIAL_DAYS,
  STARTER_PLAN_ID,
  expandSelectedAddons,
  subscriptionPeriodDays,
  type BillingCycle,
  type BillingMode,
} from '@/constants/ONBOARDING'
import {
  FREE_DELIVERY_THRESHOLD,
  ORDER_DELIVERY_CHARGE,
} from '@/constants/ORDER'
import type { OrganizationStatus, TenantHomepage } from '@/types/Organization'
import { generateSlug } from '@/utils/slug'
import { parseMenuCsv } from '@/utils/parseMenuCsv'
import {
  buildRestaurantSetupCsv,
  defaultRestaurantSetupValues,
  formatAddressFromSetup,
  parseRestaurantSetupCsv,
  storeHoursFromSetup,
  type RestaurantSetupValues,
} from '@/utils/parseRestaurantSetupCsv'
import { isMissingColumnError } from '@/utils/supabaseSchema'
import {
  homepageFromOrgRow,
  homepageSettingsPayload,
  resolveTenantHomepage,
  type TenantHomepageDraft,
} from '@/utils/tenantHomepage'
import { supabase } from '@/services/supabaseClient'

export interface OnboardRestaurantInput {
  name: string
  slug?: string
  publicPhone: string
  city: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  billingMode?: BillingMode
  trialDays?: number
  billingCycle?: BillingCycle
  addonKeys: string[]
  homepage?: TenantHomepageDraft
}

export interface OnboardRestaurantResult {
  organizationId: string
  name: string
  slug: string
  ownerEmail: string
  ownerName: string
  publicPhone: string
  city: string
  existingUser: boolean
  temporaryPassword: string | null
  inviteError: string | null
  enabledAddons: string[]
  homepage: TenantHomepage
  billingMode: BillingMode
  billingCycle: BillingCycle | null
  periodDays: number
  setupWarning: string | null
}

export interface SetupImportResult {
  updated: string[]
  warnings: string[]
}

export interface MasterOrganizationDetail {
  id: string
  name: string
  slug: string
  status: OrganizationStatus
  email: string
  homepage: TenantHomepage
}

export interface MenuImportResult {
  categoriesCreated: number
  dishesCreated: number
  errors: string[]
}

function uniqueSlug(base: string, suffix: string): string {
  const slug = generateSlug(base)
  if (!slug) return `restaurant-${suffix.slice(0, 8)}`
  return slug
}

export async function onboardRestaurant(
  input: OnboardRestaurantInput,
): Promise<ServiceResponse<OnboardRestaurantResult>> {
  const name = input.name.trim()
  const ownerEmail = input.ownerEmail.trim().toLowerCase()
  const ownerName = input.ownerName.trim()
  const ownerPhone = input.ownerPhone.trim()
  const publicPhone = input.publicPhone.trim()
  const city = input.city.trim()
  const billingMode: BillingMode = input.billingMode === 'paid' ? 'paid' : 'trial'
  const billingCycle: BillingCycle =
    billingMode === 'paid' ? (input.billingCycle ?? 'monthly') : 'monthly'
  const periodDays = subscriptionPeriodDays(
    billingMode,
    input.trialDays ?? DEFAULT_TRIAL_DAYS,
    billingCycle,
  )
  const orgStatus: OrganizationStatus = billingMode === 'paid' ? 'active' : 'trialing'
  const subscriptionStatus = billingMode === 'paid' ? 'active' : 'trialing'

  if (!name || !ownerEmail || !ownerName || !ownerPhone || !publicPhone || !city) {
    return createErrorResponse(
      'Name, city, public phone, and owner name/email/phone are required.',
    )
  }

  const slug = uniqueSlug(
    input.slug?.trim() || name,
    crypto.randomUUID(),
  )
  const enabledAddons = expandSelectedAddons(input.addonKeys)
  const resolved = resolveTenantHomepage(
    slug,
    input.homepage ?? {
      mode: 'set_later',
      customDomain: '',
      externalUrl: '',
    },
  )
  if (resolved.error) {
    return createErrorResponse(resolved.error)
  }
  const homepage = resolved.homepage
  const baseSettings = {
    onboarded_by: 'master',
    owner_name: ownerName,
    owner_phone: ownerPhone,
    homepage: homepageSettingsPayload(homepage),
  }
  const baseInsert = {
    name,
    slug,
    status: orgStatus,
    phone: publicPhone,
    email: ownerEmail,
    address: city,
    branding: {},
    opening_hours: {},
    settings: baseSettings,
  }

  const inserted = await insertOrganization(baseInsert, homepage)
  if (!inserted.success) return inserted
  const org = inserted.data

  const periodEnd = new Date()
  periodEnd.setDate(periodEnd.getDate() + periodDays)

  const { error: subError } = await supabase.from('subscriptions').insert({
    organization_id: org.id,
    plan_id: STARTER_PLAN_ID,
    status: subscriptionStatus,
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd.toISOString(),
    provider: 'manual',
    provider_ref: `onboarding-${slug}`,
  })

  if (subError) {
    return createErrorResponse(
      `Restaurant created but subscription failed: ${subError.message}`,
      subError.message,
    )
  }

  if (enabledAddons.length > 0) {
    const { error: entError } = await supabase
      .from('organization_entitlements')
      .upsert(
        enabledAddons.map((featureKey) => ({
          organization_id: org.id,
          feature_key: featureKey,
          enabled: true,
          source: 'manual' as const,
          notes: 'Set during Master onboarding',
        })),
        { onConflict: 'organization_id,feature_key' },
      )

    if (entError) {
      return createErrorResponse(
        `Restaurant created but features failed: ${entError.message}`,
        entError.message,
      )
    }
  }

  const invite = await supabase.functions.invoke('master-onboard-owner', {
    body: {
      organizationId: org.id,
      ownerEmail,
      ownerName,
      ownerPhone,
    },
  })

  let temporaryPassword: string | null = null
  let existingUser = false
  let inviteError: string | null = null

  if (invite.error) {
    inviteError =
      invite.error.message ||
      'Owner login was not created. Deploy the master-onboard-owner function.'
  } else if (invite.data && typeof invite.data === 'object') {
    const payload = invite.data as {
      error?: string
      temporaryPassword?: string | null
      existingUser?: boolean
    }
    if (payload.error) {
      inviteError = payload.error
    } else {
      temporaryPassword = payload.temporaryPassword ?? null
      existingUser = Boolean(payload.existingUser)
    }
  }

  const setupWarning = await applyPlatformSetupDefaults(org.id as string, {
    restaurantName: name,
    publicPhone,
    publicEmail: ownerEmail,
    city,
  })

  return createSuccessResponse({
    organizationId: org.id as string,
    name: org.name as string,
    slug: org.slug as string,
    ownerEmail,
    ownerName,
    publicPhone,
    city,
    existingUser,
    temporaryPassword,
    inviteError,
    enabledAddons,
    homepage,
    billingMode,
    billingCycle: billingMode === 'paid' ? billingCycle : null,
    periodDays,
    setupWarning,
  })
}

export async function getMasterOrganization(
  organizationId: string,
): Promise<ServiceResponse<MasterOrganizationDetail>> {
  const { data, error } = await supabase
    .from('organizations')
    .select(
      'id, name, slug, status, email, homepage_mode, custom_domain, homepage_url, settings',
    )
    .eq('id', organizationId)
    .maybeSingle()

  if (error && isMissingColumnError(error.message)) {
    const fallback = await supabase
      .from('organizations')
      .select('id, name, slug, status, email, settings')
      .eq('id', organizationId)
      .maybeSingle()
    if (fallback.error || !fallback.data) {
      return createErrorResponse(
        fallback.error?.message || 'Restaurant not found.',
        fallback.error?.message,
      )
    }
    return createSuccessResponse(mapMasterOrganization(fallback.data))
  }

  if (error || !data) {
    return createErrorResponse(
      error?.message || 'Restaurant not found.',
      error?.message,
    )
  }

  return createSuccessResponse(mapMasterOrganization(data))
}

export async function updateOrganizationHomepage(
  organizationId: string,
  draft: TenantHomepageDraft,
): Promise<ServiceResponse<TenantHomepage>> {
  const current = await getMasterOrganization(organizationId)
  if (!current.success) return current

  const resolved = resolveTenantHomepage(current.data.slug, draft)
  if (resolved.error) {
    return createErrorResponse(resolved.error)
  }

  const homepage = resolved.homepage

  const { data: existing } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .maybeSingle()
  const mergedSettings = {
    ...readSettings(existing?.settings),
    homepage: homepageSettingsPayload(homepage),
  }

  const withColumns = await supabase
    .from('organizations')
    .update({
      homepage_mode: homepage.mode,
      custom_domain: homepage.customDomain,
      homepage_url: homepage.homepageUrl || null,
      settings: mergedSettings,
    })
    .eq('id', organizationId)
    .select('id')
    .maybeSingle()

  if (withColumns.error && isMissingColumnError(withColumns.error.message)) {
    const fallback = await supabase
      .from('organizations')
      .update({ settings: mergedSettings })
      .eq('id', organizationId)
      .select('id')
      .maybeSingle()
    if (fallback.error) {
      return createErrorResponse(
        fallback.error.message || 'Unable to save homepage.',
        fallback.error.message,
      )
    }
    return createSuccessResponse(homepage)
  }

  if (withColumns.error) {
    if (withColumns.error.message.toLowerCase().includes('duplicate')) {
      return createErrorResponse(
        'That custom domain is already assigned to another restaurant.',
        withColumns.error.message,
      )
    }
    return createErrorResponse(
      withColumns.error.message || 'Unable to save homepage.',
      withColumns.error.message,
    )
  }

  return createSuccessResponse(homepage)
}

function mapMasterOrganization(row: {
  id: string
  name: string
  slug: string
  status: string
  email?: string | null
  homepage_mode?: string | null
  custom_domain?: string | null
  homepage_url?: string | null
  settings?: unknown
}): MasterOrganizationDetail {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as OrganizationStatus,
    email: String(row.email ?? ''),
    homepage: homepageFromOrgRow({
      slug: row.slug,
      homepage_mode: row.homepage_mode,
      custom_domain: row.custom_domain,
      homepage_url: row.homepage_url,
      settings: readSettings(row.settings),
    }),
  }
}

function readSettings(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

async function insertOrganization(
  baseInsert: Record<string, unknown>,
  homepage: TenantHomepage,
): Promise<ServiceResponse<{ id: string; name: string; slug: string }>> {
  const withColumns = await supabase
    .from('organizations')
    .insert({
      ...baseInsert,
      homepage_mode: homepage.mode,
      custom_domain: homepage.customDomain,
      homepage_url: homepage.homepageUrl || null,
    })
    .select('id, name, slug')
    .single()

  if (withColumns.error && isMissingColumnError(withColumns.error.message)) {
    const fallback = await supabase
      .from('organizations')
      .insert(baseInsert)
      .select('id, name, slug')
      .single()
    if (fallback.error || !fallback.data) {
      return organizationInsertError(fallback.error?.message)
    }
    return createSuccessResponse(fallback.data)
  }

  if (withColumns.error || !withColumns.data) {
    return organizationInsertError(withColumns.error?.message)
  }

  return createSuccessResponse(withColumns.data)
}

function organizationInsertError(
  message: string | undefined,
): ServiceResponse<{ id: string; name: string; slug: string }> {
  if (message?.toLowerCase().includes('duplicate')) {
    if (message.toLowerCase().includes('custom_domain')) {
      return createErrorResponse(
        'That custom domain is already assigned to another restaurant.',
        message,
      )
    }
    return createErrorResponse(
      'That URL slug is already taken. Choose another.',
      message,
    )
  }
  return createErrorResponse(message || 'Unable to create restaurant.', message)
}

export async function importMenuCsv(
  organizationId: string,
  csvText: string,
  publishImmediately: boolean,
): Promise<ServiceResponse<MenuImportResult>> {
  const parsed = parseMenuCsv(csvText)
  if (parsed.rows.length === 0) {
    return createErrorResponse(
      parsed.errors[0] || 'No valid menu rows found.',
    )
  }

  const { data: existingCategories, error: catLoadError } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('organization_id', organizationId)

  if (catLoadError) {
    return createErrorResponse(
      'Unable to load existing categories.',
      catLoadError.message,
    )
  }

  const categoryIds = new Map<string, string>()
  for (const row of existingCategories ?? []) {
    categoryIds.set(String(row.name).trim().toLowerCase(), String(row.id))
  }

  let categoriesCreated = 0
  const uniqueCategories = [...new Set(parsed.rows.map((row) => row.category))]

  for (const [index, categoryName] of uniqueCategories.entries()) {
    const key = categoryName.toLowerCase()
    if (categoryIds.has(key)) continue

    const { data, error } = await supabase
      .from('categories')
      .insert({
        organization_id: organizationId,
        name: categoryName,
        slug: generateSlug(`${categoryName}-${index + 1}`),
        display_order: index + 1,
        is_active: true,
      })
      .select('id, name')
      .single()

    if (error || !data) {
      parsed.errors.push(
        `Category "${categoryName}": ${error?.message || 'create failed'}`,
      )
      continue
    }
    categoryIds.set(key, String(data.id))
    categoriesCreated += 1
  }

  let dishesCreated = 0
  for (const row of parsed.rows) {
    const categoryId = categoryIds.get(row.category.toLowerCase())
    if (!categoryId) {
      parsed.errors.push(
        `Line ${row.lineNumber}: category "${row.category}" was not created.`,
      )
      continue
    }

    const slug = generateSlug(`${row.name}-${row.lineNumber}`)
    const { error } = await supabase.from('dishes').insert({
      organization_id: organizationId,
      category_id: categoryId,
      name: row.name,
      slug,
      description: row.description || null,
      price: row.price,
      is_veg: row.isVeg,
      spice_level: row.spiceLevel,
      preparation_time: row.preparationTimeMinutes,
      is_available: publishImmediately ? row.isAvailable : false,
      is_featured: row.isFeatured,
    })

    if (error) {
      parsed.errors.push(`Line ${row.lineNumber} (${row.name}): ${error.message}`)
      continue
    }
    dishesCreated += 1
  }

  if (dishesCreated === 0) {
    return createErrorResponse(
      parsed.errors[0] || 'No dishes were imported.',
    )
  }

  return createSuccessResponse({
    categoriesCreated,
    dishesCreated,
    errors: parsed.errors,
  })
}

export async function exportRestaurantSetupCsv(
  organizationId: string,
): Promise<ServiceResponse<string>> {
  const values = await loadRestaurantSetupValues(organizationId)
  if (!values.success) return values
  return createSuccessResponse(buildRestaurantSetupCsv(values.data))
}

export async function importRestaurantSetupCsv(
  organizationId: string,
  csvText: string,
): Promise<ServiceResponse<SetupImportResult>> {
  const parsed = parseRestaurantSetupCsv(csvText)
  if (parsed.errors.length > 0) {
    return createErrorResponse(parsed.errors[0])
  }

  const applied = await applyRestaurantSetup(organizationId, parsed.values)
  if (!applied.success) return applied

  return createSuccessResponse({
    updated: applied.data,
    warnings: parsed.warnings,
  })
}

async function applyPlatformSetupDefaults(
  organizationId: string,
  seed: RestaurantSetupValues,
): Promise<string | null> {
  const defaults = {
    ...defaultRestaurantSetupValues(),
    ...seed,
  }
  const applied = await applyRestaurantSetup(organizationId, defaults)
  if (!applied.success) return applied.message
  return null
}

async function loadRestaurantSetupValues(
  organizationId: string,
): Promise<ServiceResponse<RestaurantSetupValues>> {
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select(
      'name, phone, email, address, tagline, gstin, fssai_license, opening_hours, settings',
    )
    .eq('id', organizationId)
    .maybeSingle()

  if (orgError || !org) {
    return createErrorResponse(
      orgError?.message || 'Restaurant not found.',
      orgError?.message,
    )
  }

  const settings = readSettings(org.settings)
  const setup = readSettings(settings.setup)
  const openingHours = readSettings(org.opening_hours)
  const values: RestaurantSetupValues = {
    ...defaultRestaurantSetupValues(),
    restaurantName: String(org.name ?? ''),
    publicPhone: String(org.phone ?? ''),
    publicEmail: String(org.email ?? ''),
    addressLine1: stringOrEmpty(setup.address_line_1),
    addressLine2: stringOrEmpty(setup.address_line_2),
    landmark: stringOrEmpty(setup.landmark),
    city: stringOrEmpty(setup.city) || String(org.address ?? ''),
    state: stringOrEmpty(setup.state),
    pincode: stringOrEmpty(setup.pincode),
    gstin: org.gstin ? String(org.gstin) : '',
    fssaiLicense: org.fssai_license ? String(org.fssai_license) : '',
    tagline: org.tagline ? String(org.tagline) : '',
    hoursWeekdays:
      stringOrEmpty(openingHours.weekdays) || DEFAULT_SETUP_HOURS_FALLBACK.weekdays,
    hoursWeekends:
      stringOrEmpty(openingHours.weekends) || DEFAULT_SETUP_HOURS_FALLBACK.weekends,
  }

  const [eta, upiVpa, upiName] = await Promise.all([
    getOrgSetting(organizationId, 'default_eta_minutes'),
    getOrgSetting(organizationId, 'upi_vpa'),
    getOrgSetting(organizationId, 'upi_payee_name'),
  ])
  if (eta) {
    const minutes = Number.parseInt(eta, 10)
    if (Number.isFinite(minutes)) values.etaMinutes = minutes
  }
  if (upiVpa) values.upiId = upiVpa
  if (upiName) values.upiPayeeName = upiName

  const { data: delivery } = await supabase
    .from('delivery_settings')
    .select(
      'is_enabled, service_pincodes, max_distance_km, fallback_charge, free_delivery_threshold',
    )
    .eq('organization_id', organizationId)
    .is('branch_id', null)
    .maybeSingle()

  if (delivery) {
    values.delivers = Boolean(delivery.is_enabled)
    values.servicePincodes = (delivery.service_pincodes as string[] | null) ?? []
    values.deliveryRadiusKm =
      delivery.max_distance_km != null ? Number(delivery.max_distance_km) : null
    values.deliveryCharge = Number(
      delivery.fallback_charge ?? ORDER_DELIVERY_CHARGE,
    )
    values.freeDeliveryAbove =
      delivery.free_delivery_threshold != null
        ? Number(delivery.free_delivery_threshold)
        : null
  }

  return createSuccessResponse(values)
}

const DEFAULT_SETUP_HOURS_FALLBACK = {
  weekdays: '11:00-23:00',
  weekends: '10:00-23:30',
}

async function applyRestaurantSetup(
  organizationId: string,
  values: RestaurantSetupValues,
): Promise<ServiceResponse<string[]>> {
  const updated: string[] = []
  const { data: existing, error: loadError } = await supabase
    .from('organizations')
    .select('settings, opening_hours, address, name, phone, email, tagline')
    .eq('id', organizationId)
    .maybeSingle()

  if (loadError || !existing) {
    return createErrorResponse(
      loadError?.message || 'Restaurant not found.',
      loadError?.message,
    )
  }

  const settings = readSettings(existing.settings)
  const setup = {
    ...readSettings(settings.setup),
    ...(values.addressLine1 !== undefined
      ? { address_line_1: values.addressLine1 }
      : {}),
    ...(values.addressLine2 !== undefined
      ? { address_line_2: values.addressLine2 }
      : {}),
    ...(values.landmark !== undefined ? { landmark: values.landmark } : {}),
    ...(values.city !== undefined ? { city: values.city } : {}),
    ...(values.state !== undefined ? { state: values.state } : {}),
    ...(values.pincode !== undefined ? { pincode: values.pincode } : {}),
  }
  const orgUpdates: Record<string, unknown> = {
    settings: { ...settings, setup },
  }

  if (values.restaurantName) orgUpdates.name = values.restaurantName
  if (values.publicPhone) orgUpdates.phone = values.publicPhone
  if (values.publicEmail) orgUpdates.email = values.publicEmail
  if (values.tagline !== undefined) orgUpdates.tagline = values.tagline || null
  if (values.gstin !== undefined) orgUpdates.gstin = values.gstin || null
  if (values.fssaiLicense !== undefined) {
    orgUpdates.fssai_license = values.fssaiLicense || null
  }

  const formattedAddress = formatAddressFromSetup(values)
  if (formattedAddress) orgUpdates.address = formattedAddress

  const hours = storeHoursFromSetup(values)
  if (hours) {
    orgUpdates.opening_hours = {
      weekdays: values.hoursWeekdays || DEFAULT_SETUP_HOURS_FALLBACK.weekdays,
      weekends: values.hoursWeekends || DEFAULT_SETUP_HOURS_FALLBACK.weekends,
    }
    const hoursResult = await upsertOrgSetting(
      organizationId,
      'store_operating_hours',
      JSON.stringify(hours),
    )
    if (!hoursResult.success) {
      return createErrorResponse(hoursResult.message, hoursResult.error)
    }
    updated.push('hours')
  }

  const { error: orgError } = await supabase
    .from('organizations')
    .update(orgUpdates)
    .eq('id', organizationId)

  if (orgError) {
    return createErrorResponse(
      `Unable to save restaurant profile: ${orgError.message}`,
      orgError.message,
    )
  }
  updated.push('profile')

  if (values.etaMinutes != null) {
    const etaResult = await upsertOrgSetting(
      organizationId,
      'default_eta_minutes',
      String(values.etaMinutes),
    )
    if (!etaResult.success) {
      return createErrorResponse(etaResult.message, etaResult.error)
    }
    updated.push('eta')
  }

  if (values.upiId) {
    const vpaResult = await upsertOrgSetting(
      organizationId,
      'upi_vpa',
      values.upiId,
    )
    if (!vpaResult.success) {
      return createErrorResponse(vpaResult.message, vpaResult.error)
    }
    const payee = values.upiPayeeName || values.restaurantName || ''
    if (payee) {
      const nameResult = await upsertOrgSetting(
        organizationId,
        'upi_payee_name',
        payee,
      )
      if (!nameResult.success) {
        return createErrorResponse(nameResult.message, nameResult.error)
      }
    }
    updated.push('upi')
  }

  const deliveryResult = await upsertOrgDeliverySettings(organizationId, values)
  if (!deliveryResult.success) {
    return createErrorResponse(deliveryResult.message, deliveryResult.error)
  }
  if (deliveryResult.data) updated.push('delivery')

  return createSuccessResponse(updated)
}

async function upsertOrgSetting(
  organizationId: string,
  key: string,
  value: string,
): Promise<ServiceResponse<string>> {
  const { error } = await supabase.from('app_settings').upsert(
    {
      organization_id: organizationId,
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,key' },
  )
  if (error) {
    return createErrorResponse(
      `Unable to save ${key}: ${error.message}`,
      error.message,
    )
  }
  return createSuccessResponse(value)
}

async function getOrgSetting(
  organizationId: string,
  key: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('organization_id', organizationId)
    .eq('key', key)
    .maybeSingle()
  if (error) return null
  return (data?.value as string | undefined) ?? null
}

async function upsertOrgDeliverySettings(
  organizationId: string,
  values: RestaurantSetupValues,
): Promise<ServiceResponse<boolean>> {
  const hasDeliveryFields =
    values.delivers !== undefined ||
    values.servicePincodes !== undefined ||
    values.deliveryRadiusKm !== undefined ||
    values.deliveryCharge !== undefined ||
    values.freeDeliveryAbove !== undefined

  if (!hasDeliveryFields) return createSuccessResponse(false)

  const { data: existing } = await supabase
    .from('delivery_settings')
    .select('id')
    .eq('organization_id', organizationId)
    .is('branch_id', null)
    .maybeSingle()

  const payload = {
    organization_id: organizationId,
    branch_id: null,
    provider: 'own' as const,
    is_enabled: values.delivers ?? false,
    service_pincodes: values.servicePincodes ?? [],
    max_distance_km: values.deliveryRadiusKm ?? null,
    require_location_pin: false,
    service_area_note: null,
    markup_flat: 0,
    markup_percent: 0,
    fallback_charge: values.deliveryCharge ?? ORDER_DELIVERY_CHARGE,
    per_km_charge: 0,
    free_delivery_threshold:
      values.freeDeliveryAbove === undefined
        ? FREE_DELIVERY_THRESHOLD
        : values.freeDeliveryAbove,
  }

  const result = existing
    ? await supabase
        .from('delivery_settings')
        .update(payload)
        .eq('id', existing.id)
        .select('id')
        .maybeSingle()
    : await supabase
        .from('delivery_settings')
        .insert(payload)
        .select('id')
        .maybeSingle()

  if (result.error) {
    return createErrorResponse(
      `Unable to save delivery settings: ${result.error.message}`,
      result.error.message,
    )
  }
  return createSuccessResponse(true)
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

