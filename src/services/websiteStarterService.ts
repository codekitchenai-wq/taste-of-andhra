import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import {
  WEBSITE_STARTER_DISABLED_FEATURES,
  WEBSITE_STARTER_MAX_CATEGORIES,
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
  normalizeFssaiLicense,
  proposeDisplayName,
  proposeSlugBase,
} from '@/utils/websiteStarter'
import { restaurantImageObjectPath } from '@/utils/restaurantImagePath'
import { importMenuCsv } from '@/services/onboardingService'
import { supabase } from '@/services/supabaseClient'

export interface StarterIntakeInput {
  legalName: string
  preferredStoreName?: string
  /** Optional user-chosen slug; validated for availability when provided */
  slug?: string
  fssaiLicense?: string
  fssaiValidUntil?: string
  fssaiIssuedOn?: string
  fssaiCertificateUrl?: string
  fssaiCertificateHash?: string
  city: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  publicPhone?: string
  googleMapsUrl?: string
  cuisineType?: string
  addressFromFssai?: string
  state?: string
  pincode?: string
  /** Allow create even if licence/hash already exists on another org */
  allowDuplicateFssai?: boolean
}

export interface FssaiDuplicateMatch {
  id: string
  name: string
  slug: string
  fssai_license: string | null
  match: 'license' | 'hash' | 'both'
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

export async function checkOrganizationSlugAvailable(
  candidate: string,
): Promise<ServiceResponse<{ slug: string; available: boolean }>> {
  const slug = generateSlug(candidate.trim())
  if (!slug || slug.length < 2) {
    return createErrorResponse('Enter a longer URL slug.')
  }
  const { data, error } = await supabase.rpc('is_organization_slug_available', {
    candidate: slug,
  })
  if (error) {
    // Fallback direct query if RPC missing
    const { data: existing, error: qError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (qError) return createErrorResponse(qError.message)
    return createSuccessResponse({ slug, available: !existing })
  }
  return createSuccessResponse({ slug, available: Boolean(data) })
}

export async function proposeAvailableSlug(
  name: string,
  city = '',
): Promise<ServiceResponse<string>> {
  const slug = await suggestSlug(name || 'restaurant', city || 'India')
  return createSuccessResponse(slug)
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
  const legalName =
    input.legalName.trim() ||
    input.preferredStoreName?.trim() ||
    ''
  const city = input.city.trim() || 'India'
  const ownerName =
    input.ownerName.trim() || legalName || 'Restaurant owner'
  const ownerPhone = input.ownerPhone.trim()
  const displayName = proposeDisplayName(
    legalName || 'New restaurant',
    input.preferredStoreName,
  )

  let slug = generateSlug(input.slug?.trim() || '')
  if (slug) {
    const availability = await checkOrganizationSlugAvailable(slug)
    if (!availability.success) return availability
    if (!availability.data.available) {
      return createErrorResponse(
        `Slug “${slug}” is already taken. Choose another.`,
      )
    }
    slug = availability.data.slug
  } else {
    slug = await suggestSlug(displayName, city)
  }

  const ownerEmail = (
    input.ownerEmail.trim() || `starter-${slug}@noreply.directapp.in`
  ).toLowerCase()

  if (!legalName && !input.preferredStoreName?.trim()) {
    return createErrorResponse(
      'Add a legal name or store name (or run AI Extract on the FSSAI certificate).',
    )
  }

  const fssaiValidUntil = input.fssaiValidUntil?.trim() || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fssaiValidUntil)) {
    return createErrorResponse(
      'FSSAI valid until is required (YYYY-MM-DD). On payment receipts it is usually fee years from the receipt date — extract again or enter manually.',
    )
  }

  const license = normalizeFssaiLicense(input.fssaiLicense)
  const hash = input.fssaiCertificateHash?.trim() || ''
  if ((license || hash) && !input.allowDuplicateFssai) {
    const dupes = await findFssaiDuplicates({ license, hash })
    if (!dupes.success) return dupes
    if (dupes.data.length > 0) {
      const first = dupes.data[0]
      return createErrorResponse(
        `Possible duplicate FSSAI (${first.match}) with ${first.name} (${first.slug}). Review or enable “Create anyway”.`,
      )
    }
  }

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
    owner_phone: ownerPhone || null,
    city,
    storefront_whatsapp_enabled: Boolean(ownerPhone),
    restaurant_whatsapp_phone: ownerPhone || null,
    whatsapp_otp_login_enabled: false,
  }
  if (input.googleMapsUrl?.trim()) {
    settings[GOOGLE_MAPS_URL_SETTING_KEY] = input.googleMapsUrl.trim()
  }
  if (input.cuisineType?.trim()) {
    settings[CUISINE_SETTING_KEY] = input.cuisineType.trim()
  }
  if (input.state?.trim()) settings.state = input.state.trim()
  if (input.pincode?.trim()) settings.pincode = input.pincode.trim()
  if (input.fssaiIssuedOn?.trim()) {
    settings.fssai_issued_on = input.fssaiIssuedOn.trim()
  }

  const baseInsert: Record<string, unknown> = {
    name: displayName,
    slug,
    status: 'trialing',
    phone: (input.publicPhone || ownerPhone || '').trim() || null,
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
    legal_name: legalName || displayName,
    fssai_license: license || null,
    fssai_valid_until: fssaiValidUntil,
    fssai_certificate_url: input.fssaiCertificateUrl?.trim() || null,
    fssai_certificate_hash: hash || null,
    onboarding_status: 'pending_setup',
  }

  let orgRow: { id: string; name: string; slug: string } | null = null
  let fullInsert = await supabase
    .from('organizations')
    .insert(withCompliance)
    .select('id, name, slug')
    .single()

  if (
    fullInsert.error &&
    isMissingColumnError(fullInsert.error.message) &&
    'fssai_certificate_hash' in withCompliance
  ) {
    const { fssai_certificate_hash: _drop, ...withoutHash } = withCompliance
    fullInsert = await supabase
      .from('organizations')
      .insert(withoutHash)
      .select('id, name, slug')
      .single()
  }

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
    fssaiValidUntil,
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
    fssaiCertificateHash?: string
    /** Master-only: legal name from FSSAI certificate. */
    legalName?: string
    fssaiIssuedOn?: string
  },
  options?: {
    /**
     * Restaurant setup cannot change FSSAI fields. Master Approvals must
     * pass true to apply licence / validity / certificate / legal name.
     */
    allowFssaiUpdate?: boolean
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

  // FSSAI / legal compliance — Master only (never public storefront fields)
  if (options?.allowFssaiUpdate) {
    if (patch.legalName?.trim()) update.legal_name = patch.legalName.trim()
    if (patch.fssaiLicense !== undefined) {
      update.fssai_license = normalizeFssaiLicense(patch.fssaiLicense) || null
    }
    if (patch.fssaiValidUntil !== undefined) {
      update.fssai_valid_until = patch.fssaiValidUntil || null
    }
    if (patch.fssaiCertificateUrl !== undefined) {
      update.fssai_certificate_url = patch.fssaiCertificateUrl || null
    }
    if (patch.fssaiCertificateHash !== undefined) {
      update.fssai_certificate_hash = patch.fssaiCertificateHash || null
    }
    if (patch.fssaiIssuedOn !== undefined) {
      settings.fssai_issued_on = patch.fssaiIssuedOn || null
      update.settings = settings
    }
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
  const { data: org, error: loadError } = await supabase
    .from('organizations')
    .select('fssai_valid_until')
    .eq('id', organizationId)
    .maybeSingle()

  if (loadError) return createErrorResponse(loadError.message)
  const until = org?.fssai_valid_until
    ? String(org.fssai_valid_until).slice(0, 10)
    : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) {
    return createErrorResponse(
      'Set FSSAI valid until before approving go-live (required for expiry tracking).',
    )
  }

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

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}

/** SHA-256 hex fingerprint of a certificate file (for duplicate detection). */
export async function hashCertificateFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return bytesToHex(digest)
}

export async function findFssaiDuplicates(input: {
  license?: string
  hash?: string
  excludeOrganizationId?: string
}): Promise<ServiceResponse<FssaiDuplicateMatch[]>> {
  const license = normalizeFssaiLicense(input.license)
  const hash = input.hash?.trim() || ''
  if (!license && !hash) return createSuccessResponse([])

  const matches = new Map<string, FssaiDuplicateMatch>()

  if (license) {
    let query = supabase
      .from('organizations')
      .select('id, name, slug, fssai_license, fssai_certificate_hash')
      .eq('fssai_license', license)
      .limit(10)
    if (input.excludeOrganizationId) {
      query = query.neq('id', input.excludeOrganizationId)
    }
    const { data, error } = await query
    if (error && !isMissingColumnError(error.message)) {
      return createErrorResponse(error.message)
    }
    for (const row of data ?? []) {
      matches.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug,
        fssai_license: row.fssai_license,
        match: 'license',
      })
    }
  }

  if (hash) {
    let query = supabase
      .from('organizations')
      .select('id, name, slug, fssai_license, fssai_certificate_hash')
      .eq('fssai_certificate_hash', hash)
      .limit(10)
    if (input.excludeOrganizationId) {
      query = query.neq('id', input.excludeOrganizationId)
    }
    const { data, error } = await query
    if (error && !isMissingColumnError(error.message)) {
      return createErrorResponse(error.message)
    }
    for (const row of data ?? []) {
      const existing = matches.get(row.id)
      if (existing) {
        existing.match = 'both'
      } else {
        matches.set(row.id, {
          id: row.id,
          name: row.name,
          slug: row.slug,
          fssai_license: row.fssai_license,
          match: 'hash',
        })
      }
    }
  }

  return createSuccessResponse([...matches.values()])
}

export type FssaiExtractPath =
  | 'pasted_text'
  | 'foscos_pdf_text'
  | 'gemini_https_url'
  | 'gemini_data_url'
  | 'local_ocr'
  | 'gemini_partial'
  | 'gemini_failed'
  | 'none'

export const FSSAI_EXTRACT_PATH_LABELS: Record<FssaiExtractPath, string> = {
  pasted_text: 'Pasted text (local parse)',
  foscos_pdf_text: 'FoSCoS PDF text layer (local)',
  gemini_https_url: 'Gemini Flash (public HTTPS URL)',
  gemini_data_url: 'Gemini Flash (uploaded image bytes)',
  local_ocr: 'On-device OCR fallback',
  gemini_partial: 'Gemini Flash (partial — no core fields)',
  gemini_failed: 'Gemini Flash failed',
  none: 'No extract path succeeded',
}

export type FssaiAiExtract = {
  legalName: string | null
  fssaiLicense: string | null
  fssaiValidUntil: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  proprietorName: string | null
  phone: string | null
  email: string | null
  kindOfBusiness: string | null
  issuedOn: string | null
  certificateUrl?: string | null
  note?: string | null
  /** Which extractor produced this result (for on-screen debug). */
  extractPath?: FssaiExtractPath
  /** Ordered list of attempts tried during this extract call. */
  extractAttempts?: string[]
}

export async function parseFssaiWithAi(input: {
  certificateUrl?: string
  rawText?: string
  file?: File | null
}): Promise<ServiceResponse<FssaiAiExtract>> {
  let certificateUrl = input.certificateUrl?.trim() || undefined
  let certificateDataUrl: string | undefined
  const attempts: string[] = []

  const empty: FssaiAiExtract = {
    legalName: null,
    fssaiLicense: null,
    fssaiValidUntil: null,
    address: null,
    city: null,
    state: null,
    pincode: null,
    proprietorName: null,
    phone: null,
    email: null,
    kindOfBusiness: null,
    issuedOn: null,
  }

  const withPath = (
    data: FssaiAiExtract,
    extractPath: FssaiExtractPath,
  ): FssaiAiExtract => ({
    ...data,
    extractPath,
    extractAttempts: [...attempts],
  })

  // 1) Free path: pasted text
  if (input.rawText?.trim()) {
    attempts.push('try: pasted_text')
    const { parseFssaiCertificateText, countParsedFields } = await import(
      '@/utils/parseFssaiCertificateText'
    )
    const fields = parseFssaiCertificateText(input.rawText)
    if (countParsedFields(fields) >= 2) {
      attempts.push('ok: pasted_text')
      return createSuccessResponse(
        withPath(
          {
            ...empty,
            ...fields,
            note: `Filled ${countParsedFields(fields)} field(s) from text (free) — review before creating.`,
          },
          'pasted_text',
        ),
      )
    }
    attempts.push('skip: pasted_text (too few fields)')
  }

  // 2) Official FoSCoS PDF (text layer) — most effective free path
  const { isPdfFile } = await import('@/utils/extractFssaiFromPdf')
  if (input.file && isPdfFile(input.file)) {
    attempts.push('try: foscos_pdf_text')
    try {
      const { extractFssaiFromPdf } = await import('@/utils/extractFssaiFromPdf')
      const { countParsedFields } = await import(
        '@/utils/parseFssaiCertificateText'
      )
      const pdf = await extractFssaiFromPdf(input.file)
      if (countParsedFields(pdf.fields) >= 1) {
        const uploaded = await uploadIntakeCertificate(input.file)
        attempts.push('ok: foscos_pdf_text')
        return createSuccessResponse(
          withPath(
            {
              ...empty,
              ...pdf.fields,
              certificateUrl: uploaded.success
                ? uploaded.data
                : certificateUrl ?? null,
              note: pdf.note,
            },
            'foscos_pdf_text',
          ),
        )
      }
      attempts.push('skip: foscos_pdf_text (no fields)')
    } catch (error) {
      attempts.push(
        `fail: foscos_pdf_text (${error instanceof Error ? error.message : 'error'})`,
      )
      if (!certificateUrl && input.file) {
        const uploaded = await uploadIntakeCertificate(input.file)
        if (uploaded.success) certificateUrl = uploaded.data
      }
    }
  }

  // 3) Photos / public URL — local OCR first (works offline), then Gemini Flash
  const { countParsedFields } = await import(
    '@/utils/parseFssaiCertificateText'
  )

  type CloudPayload = {
    legalName?: string | null
    fssaiLicense?: string | null
    fssaiValidUntil?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    pincode?: string | null
    proprietorName?: string | null
    phone?: string | null
    email?: string | null
    kindOfBusiness?: string | null
    issuedOn?: string | null
    error?: string
    note?: string
  }

  const hasCore = (fields: {
    legalName?: string | null
    fssaiLicense?: string | null
  }) =>
    Boolean(
      (fields.legalName && String(fields.legalName).trim()) ||
        (fields.fssaiLicense && String(fields.fssaiLicense).trim()),
    )

  /** Enough to prefill the form when Gemini is down (dates/address/etc.). */
  const hasUsablePartial = (fields: FssaiAiExtract) =>
    hasCore(fields) || countParsedFields(fields) >= 2

  const mergeExtract = (
    base: FssaiAiExtract,
    extra: FssaiAiExtract,
  ): FssaiAiExtract => {
    const next = { ...base }
    for (const key of Object.keys(empty) as (keyof typeof empty)[]) {
      const value = extra[key]
      if (value && !next[key]) next[key] = value
    }
    return next
  }

  const mapCloud = (payload: CloudPayload): FssaiAiExtract => ({
    ...empty,
    legalName: payload.legalName ?? null,
    fssaiLicense: payload.fssaiLicense ?? null,
    fssaiValidUntil: payload.fssaiValidUntil ?? null,
    address: payload.address ?? null,
    city: payload.city ?? null,
    state: payload.state ?? null,
    pincode: payload.pincode ?? null,
    proprietorName: payload.proprietorName ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    kindOfBusiness: payload.kindOfBusiness ?? null,
    issuedOn: payload.issuedOn ?? null,
    certificateUrl: certificateUrl ?? null,
  })

  async function invokeGemini(body: {
    certificateUrl?: string
    certificateDataUrl?: string
    rawText?: string
  }): Promise<{
    fields: FssaiAiExtract
    blocked: boolean
    error: string | null
  }> {
    const invoke = await supabase.functions.invoke('fssai-ai-parse', { body })
    let payload = (invoke.data ?? {}) as CloudPayload

    // Non-2xx responses often put the real body on error.context
    if (invoke.error && (!payload.error || Object.keys(payload).length === 0)) {
      try {
        const ctx = (
          invoke.error as { context?: { json?: () => Promise<unknown> } }
        ).context
        if (ctx && typeof ctx.json === 'function') {
          payload = (await ctx.json()) as CloudPayload
        }
      } catch {
        // keep payload as-is
      }
    }

    const errorText =
      payload.error ||
      payload.note ||
      (invoke.error ? invoke.error.message : null)

    const blocked = /GEMINI_API_KEY not configured|OPENAI_API_KEY not configured|API_KEY_INVALID|API key not valid|not configured/i.test(
      String(errorText ?? ''),
    )

    if (errorText && (blocked || payload.error || invoke.error)) {
      return {
        fields: mapCloud(payload),
        blocked,
        error: String(errorText).slice(0, 400),
      }
    }

    const fields = mapCloud(payload)
    return {
      fields: {
        ...fields,
        note:
          payload.note ??
          (hasCore(fields)
            ? `Filled ${countParsedFields(fields)} field(s) with Gemini Flash — review before creating.`
            : 'Gemini Flash ran but could not read core FSSAI fields from this image.'),
      },
      blocked: false,
      error: null,
    }
  }

  let lastGeminiError: string | null = null
  let lastGeminiFields: FssaiAiExtract | null = null
  let lastLocalFields: FssaiAiExtract | null = null

  // Free offline path first — does not need Edge Functions
  if (input.file?.type.startsWith('image/')) {
    attempts.push('try: local_ocr')
    try {
      const { extractFssaiLocalFromFile } = await import(
        '@/utils/extractFssaiLocal'
      )
      const local = await extractFssaiLocalFromFile(input.file)
      const localExtract: FssaiAiExtract = {
        ...empty,
        ...local.fields,
        certificateUrl: certificateUrl ?? null,
        note: local.note,
      }
      lastLocalFields = localExtract
      if (hasCore(localExtract)) {
        attempts.push('ok: local_ocr (core fields)')
        return createSuccessResponse(withPath(localExtract, 'local_ocr'))
      }
      if (hasUsablePartial(localExtract)) {
        attempts.push(
          `partial: local_ocr (${countParsedFields(localExtract)} fields)`,
        )
      } else {
        attempts.push(
          `skip: local_ocr (${countParsedFields(localExtract)} fields)`,
        )
      }
    } catch (error) {
      attempts.push(
        `fail: local_ocr (${error instanceof Error ? error.message : 'error'})`,
      )
    }
  }

  // Prefer already-uploaded HTTPS URL (reliable; avoids huge data-URL payloads)
  if (certificateUrl?.startsWith('http')) {
    attempts.push('try: gemini_https_url → fssai-ai-parse')
    const gemini = await invokeGemini({ certificateUrl })
    lastGeminiError = gemini.error
    lastGeminiFields = gemini.fields
    if (gemini.error) {
      attempts.push(`fail: gemini_https_url (${gemini.error.slice(0, 100)})`)
    } else if (hasCore(gemini.fields)) {
      attempts.push('ok: gemini_https_url (core fields)')
      const merged = lastLocalFields
        ? mergeExtract(gemini.fields, lastLocalFields)
        : gemini.fields
      return createSuccessResponse(
        withPath(merged, 'gemini_https_url'),
      )
    } else {
      attempts.push(
        `partial: gemini_https_url (${countParsedFields(gemini.fields)} fields, no core)`,
      )
    }
  }

  if (input.file?.type.startsWith('image/')) {
    attempts.push('try: gemini_data_url → fssai-ai-parse')
    certificateDataUrl = await readFileAsDataUrl(input.file)
    const gemini = await invokeGemini({ certificateDataUrl })
    lastGeminiError = gemini.error ?? lastGeminiError
    if (
      countParsedFields(gemini.fields) >
      countParsedFields(lastGeminiFields ?? empty)
    ) {
      lastGeminiFields = gemini.fields
    }
    if (gemini.error) {
      attempts.push(`fail: gemini_data_url (${gemini.error.slice(0, 100)})`)
    } else if (hasCore(gemini.fields)) {
      attempts.push('ok: gemini_data_url (core fields)')
      const merged = lastLocalFields
        ? mergeExtract(gemini.fields, lastLocalFields)
        : gemini.fields
      return createSuccessResponse(withPath(merged, 'gemini_data_url'))
    } else {
      attempts.push(
        `partial: gemini_data_url (${countParsedFields(gemini.fields)} fields, no core)`,
      )
    }
  } else if (input.file && !isPdfFile(input.file)) {
    const uploaded = await uploadIntakeCertificate(input.file)
    if (!uploaded.success) return uploaded
    certificateUrl = uploaded.data
    attempts.push('try: gemini_https_url (after upload) → fssai-ai-parse')
    const gemini = await invokeGemini({ certificateUrl })
    lastGeminiError = gemini.error
    lastGeminiFields = gemini.fields
    if (gemini.error) {
      attempts.push(`fail: gemini_https_url (${gemini.error.slice(0, 100)})`)
    } else if (hasCore(gemini.fields)) {
      attempts.push('ok: gemini_https_url (core fields)')
      return createSuccessResponse(
        withPath(gemini.fields, 'gemini_https_url'),
      )
    } else {
      attempts.push('partial: gemini_https_url (no core)')
    }
  }

  // Prefer the richest available partial (local OCR often wins when Edge Function is down)
  const bestPartial = (() => {
    const localCount = lastLocalFields
      ? countParsedFields(lastLocalFields)
      : 0
    const geminiCount = lastGeminiFields
      ? countParsedFields(lastGeminiFields)
      : 0
    if (localCount === 0 && geminiCount === 0) return null
    if (localCount >= geminiCount && lastLocalFields) {
      return mergeExtract(
        lastLocalFields,
        lastGeminiFields ?? empty,
      )
    }
    if (lastGeminiFields) {
      return mergeExtract(lastGeminiFields, lastLocalFields ?? empty)
    }
    return lastLocalFields
  })()

  if (bestPartial && hasUsablePartial(bestPartial)) {
    const source =
      lastLocalFields &&
      countParsedFields(lastLocalFields) >=
        countParsedFields(lastGeminiFields ?? empty)
        ? 'local_ocr'
        : lastGeminiError
          ? 'gemini_partial'
          : 'gemini_partial'
    attempts.push(`result: ${source}_partial`)
    return createSuccessResponse(
      withPath(
        {
          ...bestPartial,
          certificateUrl: certificateUrl ?? bestPartial.certificateUrl ?? null,
          note:
            lastGeminiError && source === 'local_ocr'
              ? `Filled ${countParsedFields(bestPartial)} field(s) from on-device OCR (Gemini unavailable: ${lastGeminiError.slice(0, 100)}). Add legal name / licence if blank.`
              : bestPartial.note ||
                `Filled ${countParsedFields(bestPartial)} field(s) — enter legal name / licence manually if blank.`,
        },
        source === 'local_ocr' ? 'local_ocr' : 'gemini_partial',
      ),
    )
  }

  if (lastGeminiError) {
    attempts.push('result: gemini_failed')
    return createSuccessResponse(
      withPath(
        {
          ...empty,
          certificateUrl: certificateUrl ?? null,
          note: `Gemini extract failed: ${lastGeminiError.slice(0, 220)}. Prefer FoSCoS PDF upload, or enter fields manually. (Edge Function must be reachable for photo AI.)`,
        },
        'gemini_failed',
      ),
    )
  }

  if (!certificateUrl && !certificateDataUrl && !input.rawText?.trim()) {
    return createErrorResponse(
      'Upload an FSSAI image/PDF or paste a public certificate URL first.',
    )
  }

  attempts.push('result: none')
  return createSuccessResponse(
    withPath(
      {
        ...empty,
        certificateUrl: certificateUrl ?? null,
        note:
          'Could not read FSSAI core fields (legal name / licence). Retake a sharper full-page photo, upload the FoSCoS PDF, or enter details manually.',
      },
      'none',
    ),
  )
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
  options?: {
    maxItems?: number
    maxCategories?: number
    publishImmediately?: boolean
  },
): Promise<ServiceResponse<{ categoriesCreated: number; dishesCreated: number }>> {
  const maxItems = options?.maxItems ?? WEBSITE_STARTER_MAX_MENU_ITEMS
  const maxCategories =
    options?.maxCategories ?? WEBSITE_STARTER_MAX_CATEGORIES
  if (rows.length === 0) {
    return createErrorResponse('No menu rows to import.')
  }
  if (rows.length > maxItems) {
    return createErrorResponse(
      `Website Starter allows at most ${maxItems} menu items. You have ${rows.length} — remove ${rows.length - maxItems} before saving.`,
    )
  }
  const categoryKeys = new Set(
    rows.map((row) => (row.category.trim() || 'Menu').toLowerCase()),
  )
  if (categoryKeys.size > maxCategories) {
    return createErrorResponse(
      `Website Starter allows at most ${maxCategories} categories. You have ${categoryKeys.size} — merge or rename categories before saving.`,
    )
  }
  const csv = menuRowsToCsv(rows)
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

  // Keep full extract for review; save is gated at ≤15 items / ≤15 categories in the wizard.
  const rows = payload.rows
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
