import type { OrganizationGallery } from '@/types/Organization'
import type { OnboardingStatus } from '@/types/Organization'
import {
  WEBSITE_STARTER_PLAN_CODE,
  type GallerySlotKind,
} from '@/constants/ONBOARDING'
import { generateSlug } from '@/utils/slug'

export const PRODUCT_TRACK_SETTING_KEY = 'product_track'
export const FSSAI_ENFORCEMENT_SETTING_KEY = 'fssai_enforcement'
export const GALLERY_SETTING_KEY = 'gallery'
export const GOOGLE_MAPS_URL_SETTING_KEY = 'google_maps_url'
export const CUISINE_SETTING_KEY = 'cuisine_type'
export const MAX_MENU_ITEMS_SETTING_KEY = 'max_menu_items'

export function isWebsiteStarterTrack(
  settings: Record<string, unknown> | null | undefined,
): boolean {
  return settings?.[PRODUCT_TRACK_SETTING_KEY] === WEBSITE_STARTER_PLAN_CODE
}

export function fssaiEnforcementEnabled(
  settings: Record<string, unknown> | null | undefined,
): boolean {
  if (settings?.[FSSAI_ENFORCEMENT_SETTING_KEY] === true) return true
  return isWebsiteStarterTrack(settings)
}

export function galleryFromSettings(
  settings: Record<string, unknown> | null | undefined,
): OrganizationGallery {
  const raw = settings?.[GALLERY_SETTING_KEY]
  if (!raw || typeof raw !== 'object') {
    return { front: null, interior: null, food: null }
  }
  const gallery = raw as Record<string, unknown>
  return {
    front: typeof gallery.front === 'string' ? gallery.front : null,
    interior: typeof gallery.interior === 'string' ? gallery.interior : null,
    food: typeof gallery.food === 'string' ? gallery.food : null,
  }
}

export function galleryImageList(
  settings: Record<string, unknown> | null | undefined,
): Array<{ kind: GallerySlotKind; url: string; label: string }> {
  const gallery = galleryFromSettings(settings)
  const labels: Record<GallerySlotKind, string> = {
    front: 'Exterior',
    interior: 'Interior',
    food: 'Food',
  }
  const out: Array<{ kind: GallerySlotKind; url: string; label: string }> = []
  for (const kind of ['front', 'interior', 'food'] as GallerySlotKind[]) {
    const url = gallery[kind]
    if (url) out.push({ kind, url, label: labels[kind] })
  }
  return out
}

export function proposeDisplayName(legalName: string, preferred?: string): string {
  const preferredTrim = preferred?.trim()
  if (preferredTrim) return preferredTrim
  return legalName.trim() || 'New restaurant'
}

export function proposeSlugBase(displayName: string): string {
  return generateSlug(displayName) || 'restaurant'
}

/**
 * Normalize FSSAI licence for storage and duplicate checks.
 * Keeps letters/digits only (uppercased) so spacing variants match.
 */
export function normalizeFssaiLicense(value: string | null | undefined): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/** Digits-only phone for wa.me (Indian 10-digit → 91…). */
export function whatsappE164Digits(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.startsWith('0') && digits.length === 11) {
    return `91${digits.slice(1)}`
  }
  return digits
}

export function buildWhatsAppDeepLink(phone: string, message: string): string {
  const e164 = whatsappE164Digits(phone)
  if (!e164) return ''
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`
}

export function buildStarterEmailInvite(input: {
  displayName: string
  setupUrl: string
  ownerEmail: string
  temporaryPassword?: string | null
}): { subject: string; body: string; mailtoHref: string } {
  const subject = `DirectApp setup — ${input.displayName}`
  const passwordBlock = input.temporaryPassword
    ? `Login email: ${input.ownerEmail}\nTemporary password: ${input.temporaryPassword}\n(Change it after first login.)`
    : `Login email: ${input.ownerEmail}\nOpen the setup link below to continue.`
  const body = `Welcome to DirectApp

Your restaurant website draft: ${input.displayName}

Complete setup here (site stays private until we approve):
${input.setupUrl}

${passwordBlock}

In the setup form, please add:
1) FSSAI certificate if not already on file
2) Three photos — shop front, interior, food
3) Menu (photo/PDF or dish list)
4) Opening hours and public phone

Questions? Reply to this email or WhatsApp us.`
  const mailtoHref = `mailto:${encodeURIComponent(input.ownerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  return { subject, body, mailtoHref }
}

export function isFssaiExpired(validUntil: string | null | undefined): boolean {
  if (!validUntil) return false
  const end = new Date(`${validUntil}T23:59:59`)
  if (Number.isNaN(end.getTime())) return false
  return end.getTime() < Date.now()
}

export function isFssaiExpiringSoon(
  validUntil: string | null | undefined,
  withinDays = 30,
): boolean {
  if (!validUntil || isFssaiExpired(validUntil)) return false
  const end = new Date(`${validUntil}T23:59:59`)
  if (Number.isNaN(end.getTime())) return false
  const ms = end.getTime() - Date.now()
  return ms <= withinDays * 24 * 60 * 60 * 1000
}

export type StorefrontAccessReason =
  | 'ok'
  | 'pending_setup'
  | 'pending_review'
  | 'rejected'
  | 'fssai_expired'
  | 'suspended'

export function storefrontAccessState(input: {
  status: string | null | undefined
  onboardingStatus: OnboardingStatus | string | null | undefined
  settings: Record<string, unknown> | null | undefined
  fssaiValidUntil: string | null | undefined
}): StorefrontAccessReason {
  if (input.status === 'suspended' || input.status === 'cancelled') {
    return 'suspended'
  }

  const onboarding = input.onboardingStatus
  if (onboarding === 'pending_setup' || onboarding === 'intake') {
    return 'pending_setup'
  }
  if (onboarding === 'pending_review') return 'pending_review'
  if (onboarding === 'rejected') return 'rejected'

  if (
    fssaiEnforcementEnabled(input.settings) &&
    isFssaiExpired(input.fssaiValidUntil)
  ) {
    return 'fssai_expired'
  }

  return 'ok'
}

export function buildStarterWhatsAppInvite(input: {
  legalName: string
  displayName: string
  homepageUrl: string
  setupUrl: string
  ownerEmail: string
  temporaryPassword?: string | null
  fssaiValidUntil?: string | null
}): string {
  const passwordBlock = input.temporaryPassword
    ? `Login email: ${input.ownerEmail}\nTemporary password: ${input.temporaryPassword}\n(Change it after first login.)`
    : `Login email: ${input.ownerEmail}\nOpen the setup link below to continue.`

  const fssaiLine = input.fssaiValidUntil
    ? `\nFSSAI valid until: ${input.fssaiValidUntil}`
    : ''

  return `Welcome to DirectApp

Legal name (FSSAI): *${input.legalName}*
Your website name: *${input.displayName}*
URL: ${input.homepageUrl}${fssaiLine}

Complete your setup (site stays private until we approve):
${input.setupUrl}

${passwordBlock}

In the setup form, please add:
1) FSSAI certificate if not already on file
2) 3 photos — shop front, interior, food
3) Menu (photo/PDF or dish list)
4) Opening hours + public phone

Reply here if you need help.`
}

export function buildGoogleSetupChecklist(input: {
  name: string
  address: string | null
  phone: string | null
  homepageUrl: string
  menuUrl: string
  hoursWeekdays: string | null
  hoursWeekends: string | null
  hasPhotos: boolean
}): Array<{ label: string; ready: boolean; detail: string }> {
  return [
    {
      label: 'Website',
      ready: Boolean(input.homepageUrl),
      detail: input.homepageUrl || 'Missing',
    },
    {
      label: 'Menu URL',
      ready: Boolean(input.menuUrl),
      detail: input.menuUrl || 'Missing',
    },
    {
      label: 'Phone',
      ready: Boolean(input.phone?.trim()),
      detail: input.phone?.trim() || 'Add in setup',
    },
    {
      label: 'Address',
      ready: Boolean(input.address?.trim()),
      detail: input.address?.trim() || 'Add in setup',
    },
    {
      label: 'Opening hours',
      ready: Boolean(input.hoursWeekdays || input.hoursWeekends),
      detail:
        [input.hoursWeekdays, input.hoursWeekends].filter(Boolean).join(' / ') ||
        'Add in setup',
    },
    {
      label: 'Photos',
      ready: input.hasPhotos,
      detail: input.hasPhotos ? 'Gallery ready' : 'Add front / interior / food',
    },
    {
      label: 'Google Business Profile',
      ready: false,
      detail: 'Owner action required — claim/update on Google',
    },
  ]
}

export function buildStarterSeo(input: {
  name: string
  city: string | null
  cuisine: string | null
}): { title: string; description: string } {
  const city = input.city?.trim()
  const cuisine = input.cuisine?.trim() || 'Restaurant'
  const title = city
    ? `${input.name} | ${cuisine} in ${city}`
    : `${input.name} | ${cuisine}`
  const description = city
    ? `Discover ${cuisine.toLowerCase()} at ${input.name} in ${city}. View the menu online.`
    : `Discover ${cuisine.toLowerCase()} at ${input.name}. View the menu online.`
  return { title, description }
}
