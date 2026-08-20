import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import {
  WEBSITE_STARTER_DISABLED_FEATURES,
  WEBSITE_STARTER_MAX_MENU_ITEMS,
  WEBSITE_STARTER_PLAN_CODE,
  WEBSITE_STARTER_PLAN_ID,
  type GallerySlotKind,
} from '@/constants/ONBOARDING'
import { STORAGE_BUCKET } from '@/constants/APP'
import type {
  OnboardingStatus,
  Organization,
  OrganizationGallery,
} from '@/types/Organization'
import type { MenuCsvRow } from '@/utils/parseMenuCsv'
import { generateSlug } from '@/utils/slug'
import { isMissingColumnError } from '@/utils/supabaseSchema'
import {
  platformSubdomainUrl,
  resolveTenantHomepage,
} from '@/utils/tenantHomepage'
import {
  CUISINE_SETTING_KEY,
  FSSAI_ENFORCEMENT_SETTING_KEY,
  GALLERY_SETTING_KEY,
  GOOGLE_MAPS_URL_SETTING_KEY,
  MAX_MENU_ITEMS_SETTING_KEY,
  PRODUCT_TRACK_SETTING_KEY,
  buildStarterWhatsAppInvite,
  galleryFromSettings,
  proposeDisplayName,
  proposeSlugBase,
} from '@/utils/websiteStarter'
import { restaurantImageObjectPath } from '@/utils/restaurantImagePath'
import { importMenuCsv } from '@/services/onboardingService'
import { supabase } from '@/services/supabaseClient'

export interface StarterIntakeInput {
  legalName: string
  preferredStoreName?: string
  fssaiLicense?: string
  fssaiValidUntil?: string
  fssaiCertificateUrl?: string
  city: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  publicPhone?: string
  googleMapsUrl?: string
  cuisineType?: string
  addressFromFssai?: string
}

export interface StarterIntakeResult {
  organizationId: string
  legalName: string
  displayName: string
  slug: string
  homepageUrl: string
  ownerEmail: string
  temporaryPassword: string | null
  existingUser: boolean
  inviteError: string | null
  setupUrl: string
  inviteToken: string
  whatsappMessage: string
}

export interface StarterOrgSummary {
  id: string
  name: string
  legal_name: string | null
  slug: string
  status: string
  onboarding_status: OnboardingStatus | null
  phone: string | null
  fssai_license: string | null
  fssai_valid_until: string | null
  fssai_certificate_url: string | null
  homepage_url: string | null
  settings: Record<string, unknown>
  created_at: string
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function randomPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  let value = 'Da-'
  for (const byte of bytes) {
    value += alphabet[byte % alphabet.length]
  }
  return value
}

async function suggestSlug(name: string, city: string): Promise<string> {
  const { data, error } = await supabase.rpc('suggest_organization_slug', {
    proposed_name: name,
    city,
  })
  if (!error && typeof data === 'string' && data.trim()) {
    return data.trim()
  }
  const base = proposeSlugBase(name)
  const cityPart = generateSlug(city).replace(/-/g, '')
  let candidate = base
  for (let n = 0; n < 40; n += 1) {
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!existing) return candidate
    candidate =
      n === 0 && cityPart ? `${base}-${cityPart}` : `${base}-${n + 1}`
  }
  return `${base}-${Date.now().toString(36)}`
}

async function disableOrderingEntitlements(organizationId: string) {
  const rows = WEBSITE_STARTER_DISABLED_FEATURES.map((feature_key) => ({
    organization_id: organizationId,
    feature_key,
    enabled: false,
    source: 'manual' as const,
    notes: 'Website Starter: ordering modules off',
  }))

  const { error } = await supabase.from('organization_entitlements').upsert(rows, {
    onConflict: 'organization_id,feature_key',
  })
  return error
}

async function enableStarterEntitlements(organizationId: string) {
  const rows = [
    {
      organization_id: organizationId,
      feature_key: 'menu',
      enabled: true,
      source: 'plan' as const,
      notes: 'Website Starter',
    },
    {
      organization_id: organizationId,
      feature_key: 'settings',
      enabled: true,
      source: 'plan' as const,
      notes: 'Website Starter',
    },
    {
      organization_id: organizationId,
      feature_key: 'ai_menu_import',
      enabled: true,
      source: 'plan' as const,
      notes: 'Website Starter AI menu',
    },
  ]
  await supabase.from('organization_entitlements').upsert(rows, {
    onConflict: 'organization_id,feature_key',
  })
}

export async function intakeWebsiteStarter(
  input: StarterIntakeInput,
): Promise<ServiceResponse<StarterIntakeResult>> {
  const legalName = input.legalName.trim()
  const city = input.city.trim()
  const ownerName = input.ownerName.trim()
  const ownerEmail = input.ownerEmail.trim().toLowerCase()
  const ownerPhone = input.ownerPhone.trim()

  if (!legalName || !city || !ownerName || !ownerEmail || !ownerPhone) {
    return createErrorResponse(
      'Legal name, city, and owner name/email/WhatsApp are required.',
    )
  }

  const displayName = proposeDisplayName(legalName, input.preferredStoreName)
  const slug = await suggestSlug(displayName, city)
  const homepage = resolveTenantHomepage(slug, {
    mode: 'platform_subdomain',
    customDomain: '',
    externalUrl: '',
  })
  if (homepage.error) {
    return createErrorResponse(homepage.error)
  }

  const settings: Record<string, unknown> = {
    [PRODUCT_TRACK_SETTING_KEY]: WEBSITE_STARTER_PLAN_CODE,
    [FSSAI_ENFORCEMENT_SETTING_KEY]: true,
    [MAX_MENU_ITEMS_SETTING_KEY]: WEBSITE_STARTER_MAX_MENU_ITEMS,
    [GALLERY_SETTING_KEY]: { front: null, interior: null, food: null },
    owner_name: ownerName,
    owner_phone: ownerPhone,
    city,
    storefront_whatsapp_enabled: Boolean(ownerPhone),
    restaurant_whatsapp_phone: ownerPhone,
    whatsapp_otp_login_enabled: false,
  }
  if (input.googleMapsUrl?.trim()) {
    settings[GOOGLE_MAPS_URL_SETTING_KEY] = input.googleMapsUrl.trim()
  }
  if (input.cuisineType?.trim()) {
    settings[CUISINE_SETTING_KEY] = input.cuisineType.trim()
  }

  const baseInsert: Record<string, unknown> = {
    name: displayName,
    slug,
    status: 'trialing',
    phone: (input.publicPhone || ownerPhone).trim(),
    email: ownerEmail,
    address: input.addressFromFssai?.trim() || city,
    branding: {},
    opening_hours: {},
    settings,
    homepage_mode: homepage.homepage.mode,
    custom_domain: homepage.homepage.customDomain,
    homepage_url: homepage.homepage.homepageUrl,
  }

  const withCompliance: Record<string, unknown> = {
    ...baseInsert,
    legal_name: legalName,
    fssai_license: input.fssaiLicense?.trim() || null,
    fssai_valid_until: input.fssaiValidUntil?.trim() || null,
    fssai_certificate_url: input.fssaiCertificateUrl?.trim() || null,
    onboarding_status: 'pending_setup',
  }

  let orgRow: { id: string; name: string; slug: string } | null = null
  const fullInsert = await supabase
    .from('organizations')
    .insert(withCompliance)
    .select('id, name, slug')
    .single()

  if (fullInsert.error && isMissingColumnError(fullInsert.error.message)) {
    const fallback = await supabase
      .from('organizations')
      .insert(baseInsert)
      .select('id, name, slug')
      .single()
    if (fallback.error || !fallback.data) {
      return createErrorResponse(
        fallback.error?.message || 'Unable to create restaurant.',
      )
    }
    orgRow = fallback.data
  } else if (fullInsert.error || !fullInsert.data) {
    if (fullInsert.error?.message?.toLowerCase().includes('duplicate')) {
      return createErrorResponse(
        'That URL slug is already taken. Adjust the store name.',
        fullInsert.error.message,
      )
    }
    return createErrorResponse(
      fullInsert.error?.message || 'Unable to create restaurant.',
    )
  } else {
    orgRow = fullInsert.data
  }

  const organizationId = orgRow.id

  const periodEnd = new Date()
  periodEnd.setFullYear(periodEnd.getFullYear() + 1)

  const { error: subError } = await supabase.from('subscriptions').insert({
    organization_id: organizationId,
    plan_id: WEBSITE_STARTER_PLAN_ID,
    status: 'trialing',
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd.toISOString(),
    provider: 'manual',
    provider_ref: 'website-starter-intake',
  })

  if (subError) {
    return createErrorResponse(
      'Restaurant created but subscription failed.',
      subError.message,
    )
  }

  await enableStarterEntitlements(organizationId)
  const disableError = await disableOrderingEntitlements(organizationId)
  if (disableError) {
    console.warn('website starter disable entitlements', disableError.message)
  }

  const invite = await supabase.functions.invoke('master-onboard-owner', {
    body: {
      organizationId,
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
      'Owner login was not created. Deploy master-onboard-owner.'
    temporaryPassword = randomPassword()
  } else if (invite.data && typeof invite.data === 'object') {
    const payload = invite.data as {
      temporaryPassword?: string | null
      existingUser?: boolean
      error?: string
    }
    if (payload.error) inviteError = payload.error
    temporaryPassword = payload.temporaryPassword ?? null
    existingUser = Boolean(payload.existingUser)
  }

  const token = randomToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { error: inviteRowError } = await supabase.from('onboarding_invites').insert({
    organization_id: organizationId,
    token,
    owner_email: ownerEmail,
    owner_phone: ownerPhone,
    temporary_password: temporaryPassword,
    expires_at: expiresAt.toISOString(),
  })

  if (inviteRowError && !isMissingColumnError(inviteRowError.message)) {
    inviteError =
      inviteError ||
      `Invite token save failed: ${inviteRowError.message}`
  }

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://www.directapp.in'
  const setupUrl = `${origin}/setup/${token}`
  const homepageUrl =
    homepage.homepage.homepageUrl || platformSubdomainUrl(slug)

  const whatsappMessage = buildStarterWhatsAppInvite({
    legalName,
    displayName,
    homepageUrl,
    setupUrl,
    ownerEmail,
    temporaryPassword: existingUser ? null : temporaryPassword,
    fssaiValidUntil: input.fssaiValidUntil?.trim() || null,
  })

  return createSuccessResponse({
    organizationId,
    legalName,
    displayName,
    slug,
    homepageUrl,
    ownerEmail,
    temporaryPassword,
    existingUser,
    inviteError,
    setupUrl,
    inviteToken: token,
    whatsappMessage,
  })
}

export async function listPendingStarterOrgs(): Promise<
  ServiceResponse<StarterOrgSummary[]>
> {
  const { data, error } = await supabase
    .from('organizations')
    .select(
      'id, name, legal_name, slug, status, onboarding_status, phone, fssai_license, fssai_valid_until, fssai_certificate_url, homepage_url, settings, created_at',
    )
    .in('onboarding_status', ['pending_setup', 'pending_review', 'rejected'])
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingColumnError(error.message)) {
      return createSuccessResponse([])
    }
    return createErrorResponse(error.message)
  }

  return createSuccessResponse((data ?? []) as StarterOrgSummary[])
}

export async function getInviteByToken(token: string): Promise<
  ServiceResponse<{
    organizationId: string
    ownerEmail: string | null
    temporaryPassword: string | null
    expiresAt: string
    org: Partial<Organization>
  }>
> {
  const { data, error } = await supabase
    .from('onboarding_invites')
    .select(
      'organization_id, owner_email, temporary_password, expires_at, consumed_at',
    )
    .eq('token', token)
    .maybeSingle()

  if (error) {
    return createErrorResponse(error.message)
  }
  if (!data) {
    return createErrorResponse('Setup link is invalid.')
  }
  if (data.consumed_at) {
    return createErrorResponse('This setup link was already used.')
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return createErrorResponse('This setup link has expired.')
  }

  const org = await supabase
    .from('organizations')
    .select(
      'id, name, legal_name, slug, phone, email, address, branding, settings, opening_hours, fssai_license, fssai_valid_until, fssai_certificate_url, onboarding_status, homepage_url, status',
    )
    .eq('id', data.organization_id)
    .maybeSingle()

  if (org.error || !org.data) {
    return createErrorResponse(org.error?.message || 'Restaurant not found.')
  }

  return createSuccessResponse({
    organizationId: data.organization_id,
    ownerEmail: data.owner_email,
    temporaryPassword: data.temporary_password,
    expiresAt: data.expires_at,
    org: org.data as Partial<Organization>,
  })
}

export async function updateStarterProfile(
  organizationId: string,
  patch: {
    displayName?: string
    phone?: string
    email?: string
    address?: string
    tagline?: string
    description?: string
    weekdayHours?: string
    weekendHours?: string
    googleMapsUrl?: string
    cuisineType?: string
    whatsappPhone?: string
    logoUrl?: string
    heroUrl?: string
    gallery?: OrganizationGallery
    fssaiLicense?: string
    fssaiValidUntil?: string
    fssaiCertificateUrl?: string
  },
): Promise<ServiceResponse<true>> {
  const { data: current, error: loadError } = await supabase
    .from('organizations')
    .select(
      'settings, branding, opening_hours, legal_name, onboarding_status, status',
    )
    .eq('id', organizationId)
    .maybeSingle()

  if (loadError || !current) {
    return createErrorResponse(loadError?.message || 'Restaurant not found.')
  }

  const settings = {
    ...((current.settings as Record<string, unknown>) || {}),
  }
  const branding = {
    ...((current.branding as Record<string, unknown>) || {}),
  }
  const openingHours = {
    ...((current.opening_hours as Record<string, unknown>) || {}),
  }

  if (patch.googleMapsUrl !== undefined) {
    settings[GOOGLE_MAPS_URL_SETTING_KEY] = patch.googleMapsUrl || null
  }
  if (patch.cuisineType !== undefined) {
    settings[CUISINE_SETTING_KEY] = patch.cuisineType || null
  }
  if (patch.whatsappPhone !== undefined) {
    settings.restaurant_whatsapp_phone = patch.whatsappPhone
    settings.storefront_whatsapp_enabled = Boolean(patch.whatsappPhone?.trim())
  }
  if (patch.gallery) {
    settings[GALLERY_SETTING_KEY] = {
      ...galleryFromSettings(settings),
      ...patch.gallery,
    }
  }
  if (patch.logoUrl !== undefined) branding.logo_url = patch.logoUrl
  if (patch.heroUrl !== undefined) branding.hero_url = patch.heroUrl
  if (patch.weekdayHours !== undefined) {
    openingHours.weekdays = patch.weekdayHours
  }
  if (patch.weekendHours !== undefined) {
    openingHours.weekends = patch.weekendHours
  }

  const update: Record<string, unknown> = {
    settings,
    branding,
    opening_hours: openingHours,
    updated_at: new Date().toISOString(),
  }
  if (patch.displayName?.trim()) update.name = patch.displayName.trim()
  if (patch.phone !== undefined) update.phone = patch.phone
  if (patch.email !== undefined) update.email = patch.email
  if (patch.address !== undefined) update.address = patch.address
  if (patch.tagline !== undefined) update.tagline = patch.tagline
  if (patch.description !== undefined) update.description = patch.description
  if (patch.fssaiLicense !== undefined) {
    update.fssai_license = patch.fssaiLicense
  }
  if (patch.fssaiValidUntil !== undefined) {
    update.fssai_valid_until = patch.fssaiValidUntil || null
  }
  if (patch.fssaiCertificateUrl !== undefined) {
    update.fssai_certificate_url = patch.fssaiCertificateUrl || null
  }

  const { error } = await supabase
    .from('organizations')
    .update(update)
    .eq('id', organizationId)

  if (error) return createErrorResponse(error.message)
  return createSuccessResponse(true)
}

export async function submitStarterForReview(
  organizationId: string,
): Promise<ServiceResponse<true>> {
  const { error } = await supabase
    .from('organizations')
    .update({
      onboarding_status: 'pending_review',
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (error) {
    if (isMissingColumnError(error.message)) {
      return createErrorResponse(
        'Onboarding columns are missing. Apply the website_starter migration.',
      )
    }
    return createErrorResponse(error.message)
  }
  return createSuccessResponse(true)
}

export async function approveStarterGoLive(
  organizationId: string,
): Promise<ServiceResponse<true>> {
  const { error } = await supabase
    .from('organizations')
    .update({
      status: 'active',
      onboarding_status: 'live',
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (error) return createErrorResponse(error.message)

  await supabase
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('organization_id', organizationId)
    .eq('plan_id', WEBSITE_STARTER_PLAN_ID)

  return createSuccessResponse(true)
}

export async function rejectStarterGoLive(
  organizationId: string,
  note?: string,
): Promise<ServiceResponse<true>> {
  const { data } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .maybeSingle()

  const settings = {
    ...((data?.settings as Record<string, unknown>) || {}),
    review_note: note?.trim() || null,
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      onboarding_status: 'rejected',
      settings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (error) return createErrorResponse(error.message)
  return createSuccessResponse(true)
}

export async function uploadOrgMedia(input: {
  organizationId: string
  file: File
  folder: 'gallery' | 'fssai' | 'menu-imports' | 'branding'
  slot?: GallerySlotKind | 'logo' | 'hero' | 'cert' | 'menu'
}): Promise<ServiceResponse<string>> {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]
  if (!allowed.includes(input.file.type)) {
    return createErrorResponse('Only JPEG, PNG, WebP, or PDF files are allowed.')
  }
  if (input.file.size > 8 * 1024 * 1024) {
    return createErrorResponse('File must be smaller than 8 MB.')
  }

  const extension = input.file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const entityId = input.slot || 'file'
  const path = restaurantImageObjectPath(
    input.organizationId,
    input.folder === 'gallery' || input.folder === 'branding'
      ? 'categories'
      : 'dishes',
    `${input.folder}-${entityId}`,
    `${Date.now()}.${extension}`,
  )

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, input.file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) {
    return createErrorResponse('Failed to upload file.', error.message)
  }
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return createSuccessResponse(data.publicUrl)
}

/** Staging uploads before an organization exists (Master intake). */
export const FSSAI_INTAKE_STAGING_ORG_ID =
  'b0000000-0000-4000-8000-000000000099'

export async function uploadIntakeCertificate(
  file: File,
): Promise<ServiceResponse<string>> {
  return uploadOrgMedia({
    organizationId: FSSAI_INTAKE_STAGING_ORG_ID,
    file,
    folder: 'fssai',
    slot: 'cert',
  })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read file.'))
    }
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}

export async function parseFssaiWithAi(input: {
  certificateUrl?: string
  rawText?: string
  file?: File | null
}): Promise<
  ServiceResponse<{
    legalName: string | null
    fssaiLicense: string | null
    fssaiValidUntil: string | null
    address: string | null
    certificateUrl?: string | null
    note?: string | null
  }>
> {
  let certificateUrl = input.certificateUrl?.trim() || undefined
  let certificateDataUrl: string | undefined

  if (input.file) {
    const isImage = input.file.type.startsWith('image/')
    if (isImage) {
      certificateDataUrl = await readFileAsDataUrl(input.file)
    } else {
      const uploaded = await uploadIntakeCertificate(input.file)
      if (!uploaded.success) return uploaded
      certificateUrl = uploaded.data
    }
  }

  if (!certificateUrl && !certificateDataUrl && !input.rawText?.trim()) {
    return createErrorResponse(
      'Upload an FSSAI image/PDF or paste a public certificate URL first.',
    )
  }

  const invoke = await supabase.functions.invoke('fssai-ai-parse', {
    body: {
      certificateUrl,
      certificateDataUrl,
      rawText: input.rawText,
    },
  })

  if (invoke.error) {
    return createErrorResponse(
      invoke.error.message ||
        'FSSAI AI parse unavailable. Deploy fssai-ai-parse or enter details manually.',
    )
  }

  const payload = (invoke.data ?? {}) as {
    legalName?: string | null
    fssaiLicense?: string | null
    fssaiValidUntil?: string | null
    address?: string | null
    error?: string
    note?: string
  }

  if (payload.error) {
    return createErrorResponse(payload.error)
  }

  return createSuccessResponse({
    legalName: payload.legalName ?? null,
    fssaiLicense: payload.fssaiLicense ?? null,
    fssaiValidUntil: payload.fssaiValidUntil ?? null,
    address: payload.address ?? null,
    certificateUrl: certificateUrl ?? null,
    note: payload.note ?? null,
  })
}

export function menuRowsToCsv(rows: MenuCsvRow[]): string {
  const header =
    'category,name,price,is_veg,spice_level,description,preparation_time_minutes,is_available,is_featured,display_order'
  const lines = rows.map((row) =>
    [
      csvEscape(row.category),
      csvEscape(row.name),
      String(row.price),
      row.isVeg ? 'TRUE' : 'FALSE',
      row.spiceLevel ?? '',
      csvEscape(row.description),
      row.preparationTimeMinutes ?? '',
      row.isAvailable ? 'TRUE' : 'FALSE',
      row.isFeatured ? 'TRUE' : 'FALSE',
      String(row.displayOrder),
    ].join(','),
  )
  return [header, ...lines].join('\n')
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function applyMenuDraftRows(
  organizationId: string,
  rows: MenuCsvRow[],
  options?: { maxItems?: number; publishImmediately?: boolean },
): Promise<ServiceResponse<{ categoriesCreated: number; dishesCreated: number }>> {
  const max = options?.maxItems ?? WEBSITE_STARTER_MAX_MENU_ITEMS
  const limited = rows.slice(0, max)
  if (limited.length === 0) {
    return createErrorResponse('No menu rows to import.')
  }
  const csv = menuRowsToCsv(limited)
  const result = await importMenuCsv(
    organizationId,
    csv,
    options?.publishImmediately ?? false,
  )
  if (!result.success) return result
  return createSuccessResponse({
    categoriesCreated: result.data.categoriesCreated,
    dishesCreated: result.data.dishesCreated,
  })
}

export async function createMenuImportJob(
  organizationId: string,
  sourcePaths: string[],
): Promise<ServiceResponse<{ jobId: string }>> {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('menu_import_jobs')
    .insert({
      organization_id: organizationId,
      status: 'uploaded',
      source_paths: sourcePaths,
      draft_rows: [],
      created_by: userData.user?.id ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    return createErrorResponse(
      error?.message ||
        'Unable to create menu import job. Apply website_starter migration.',
    )
  }
  return createSuccessResponse({ jobId: data.id })
}

export async function saveMenuImportDraft(
  jobId: string,
  draftRows: MenuCsvRow[],
  status: 'ready' | 'failed' = 'ready',
  errorMessage?: string,
): Promise<ServiceResponse<true>> {
  const { error } = await supabase
    .from('menu_import_jobs')
    .update({
      status,
      draft_rows: draftRows,
      error: errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (error) return createErrorResponse(error.message)
  return createSuccessResponse(true)
}

export async function markMenuImportApplied(
  jobId: string,
): Promise<ServiceResponse<true>> {
  const { error } = await supabase
    .from('menu_import_jobs')
    .update({
      status: 'applied',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
  if (error) return createErrorResponse(error.message)
  return createSuccessResponse(true)
}

export async function parseMenuWithAi(input: {
  organizationId: string
  sourcePaths: string[]
  jobId?: string
}): Promise<ServiceResponse<{ jobId: string; rows: MenuCsvRow[] }>> {
  let jobId = input.jobId
  if (!jobId) {
    const created = await createMenuImportJob(
      input.organizationId,
      input.sourcePaths,
    )
    if (!created.success) return created
    jobId = created.data.jobId
  }

  await supabase
    .from('menu_import_jobs')
    .update({ status: 'parsing', updated_at: new Date().toISOString() })
    .eq('id', jobId)

  const invoke = await supabase.functions.invoke('menu-ai-parse', {
    body: {
      organizationId: input.organizationId,
      sourcePaths: input.sourcePaths,
      jobId,
    },
  })

  if (invoke.error) {
    await saveMenuImportDraft(jobId, [], 'failed', invoke.error.message)
    return createErrorResponse(
      invoke.error.message ||
        'AI menu parse failed. Upload a CSV or enter items manually.',
    )
  }

  const payload = (invoke.data ?? {}) as {
    rows?: MenuCsvRow[]
    error?: string
  }

  if (payload.error || !Array.isArray(payload.rows)) {
    const message = payload.error || 'AI returned no menu rows.'
    await saveMenuImportDraft(jobId, [], 'failed', message)
    return createErrorResponse(message)
  }

  const rows = payload.rows.slice(0, WEBSITE_STARTER_MAX_MENU_ITEMS)
  await saveMenuImportDraft(jobId, rows, 'ready')
  return createSuccessResponse({ jobId, rows })
}

export async function setGallerySlot(
  organizationId: string,
  kind: GallerySlotKind,
  url: string,
): Promise<ServiceResponse<true>> {
  return updateStarterProfile(organizationId, {
    gallery: { [kind]: url },
  })
}

export async function countOrgDishes(
  organizationId: string,
): Promise<ServiceResponse<number>> {
  const { count, error } = await supabase
    .from('dishes')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (error) return createErrorResponse(error.message)
  return createSuccessResponse(count ?? 0)
}

export async function loadStarterOrg(
  organizationId: string,
): Promise<ServiceResponse<Partial<Organization>>> {
  const { data, error } = await supabase
    .from('organizations')
    .select(
      'id, name, legal_name, slug, status, phone, email, address, tagline, description, branding, settings, opening_hours, fssai_license, fssai_valid_until, fssai_certificate_url, onboarding_status, homepage_url, homepage_mode',
    )
    .eq('id', organizationId)
    .maybeSingle()

  if (error || !data) {
    return createErrorResponse(error?.message || 'Restaurant not found.')
  }
  return createSuccessResponse(data as Partial<Organization>)
}
