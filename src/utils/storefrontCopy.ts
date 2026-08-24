import { LOCAL_IMAGES } from '@/constants/IMAGES'
import { APP_DESCRIPTION, CONTACT, OPENING_HOURS } from '@/constants/APP'
import { SHOW_TEST_HELPERS } from '@/constants/DEMO_ACCOUNTS'
import { heroContent, whyChooseUsItems } from '@/data/home'
import type { OrganizationContextValue } from '@/contexts/OrganizationContext'
import { isSpiceMalabarSlug, isTasteOfAndhraSlug } from '@/constants/TENANTS'
import {
  restaurantDisplayName,
  restaurantWhatsAppPhoneFromSettings,
} from '@/utils/tenantFeatures'
import { isAndhraLocalAsset, optimizeMenuImage } from '@/utils/menuImage'
import { isPlatformMarketingHost } from '@/utils/platformHost'
import {
  galleryFromSettings,
  GOOGLE_MAPS_URL_SETTING_KEY,
  isWebsiteStarterTrack,
} from '@/utils/websiteStarter'
import {
  CHOPSTICKS_SPICE_MALABAR_GOOGLE_PLACE_REF,
  googleMapsDirectionsUrl,
  googleReviewsFromSettings,
} from '@/utils/googleReviews'

export const SPICE_MALABAR_HERO = '/images/tenants/spice-malabar-hero.png'

/** Exact Google Business listing used by Chopsticks reviews / directions. */
export const SPICE_MALABAR_MAPS_URL =
  'https://www.google.com/maps?cid=11066221307886117258'

export const SPICE_MALABAR_CONTACT = {
  name: 'Chopstick Spice Malabar',
  legalName: 'Chopsticks Spice Malabar',
  tagline: 'Kerala speciality restaurant',
  description:
    'Authentic Kerala, South Indian, North Indian and Indo-Chinese from Viman Nagar, Pune.',
  phone: '+91 78418 22215',
  alternatePhone: '+91 98900 82699',
  address:
    'Shop No 1, Gulmohar Regency, Symbiosis College Road, Viman Nagar, Pune 411014',
  mapsUrl: SPICE_MALABAR_MAPS_URL,
  weekdayHours: '07:00 AM – 11:30 PM',
  weekendHours: '07:00 AM – 11:30 PM',
} as const

function brandingHeroUrl(
  branding: Record<string, unknown> | undefined,
): string | null {
  return typeof branding?.hero_url === 'string' ? branding.hero_url : null
}

function isSpiceMalabar(org: OrganizationContextValue) {
  return isSpiceMalabarSlug(org.slug)
}

export function isSpiceMalabarStorefront(org: OrganizationContextValue) {
  return isSpiceMalabar(org)
}

/** Public /menu and /light-menu for the current restaurant. */
export function storefrontPublicMenuEnabled(_org: OrganizationContextValue) {
  return true
}

/** Public /party-order for the current restaurant. */
export function storefrontPartyOrdersEnabled(_org: OrganizationContextValue) {
  return true
}

/** QA footer/login helpers — current restaurant only, never other tenants’ logins. */
export function showStorefrontQaHelpers(org: OrganizationContextValue) {
  if (!SHOW_TEST_HELPERS) return false
  if (org.isLoading) return false
  if (isPlatformMarketingHost()) return false
  return true
}

function isOtherTenant(org: OrganizationContextValue) {
  return Boolean(
    org.resolvedFromHost && org.slug && !isSpiceMalabarSlug(org.slug),
  )
}

export function storefrontHero(org: OrganizationContextValue) {
  const name = restaurantDisplayName(org)
  const brandingHero = brandingHeroUrl(org.branding)

  if (isSpiceMalabar(org)) {
    return {
      kicker: `Welcome to ${name}`,
      headline: org.tagline?.trim() || SPICE_MALABAR_CONTACT.tagline,
      description:
        org.description?.trim() || SPICE_MALABAR_CONTACT.description,
      imageUrl: brandingHero || SPICE_MALABAR_HERO,
      imageAlt: `${name} — Pomfret Tandoori`,
    }
  }

  if (isOtherTenant(org)) {
    const gallery = galleryFromSettings(org.settings)
    const starterHero =
      isWebsiteStarterTrack(org.settings) && gallery.front
        ? gallery.front
        : null
    return {
      kicker: `Welcome to ${name}`,
      headline:
        org.tagline?.trim() ||
        (isWebsiteStarterTrack(org.settings)
          ? 'View our menu'
          : 'Order online'),
      description:
        org.description?.trim() ||
        `Fresh meals from ${name} — delivery and pickup.`,
      imageUrl: brandingHero || starterHero || SPICE_MALABAR_HERO,
      imageAlt: `${name} kitchen`,
    }
  }

  return {
    kicker: 'Welcome to The Taste of Andhra',
    headline: heroContent.headline,
    description: heroContent.description,
    imageUrl: heroContent.imageUrl,
    imageAlt: 'Andhra cuisine spread with biryani and curries',
  }
}

export function storefrontWhyChooseUs(org: OrganizationContextValue) {
  if (!isSpiceMalabar(org) && !org.resolvedFromHost) {
    return whyChooseUsItems
  }

  const name = org.name || 'us'
  if (isSpiceMalabar(org)) {
    return [
      {
        title: 'Kerala specials',
        description:
          'Nadan curries, appam, pothichoru and Malabar biryani cooked the traditional way.',
      },
      {
        title: 'Fresh ingredients',
        description:
          'Daily spices, coconut, and seafood sourced for Viman Nagar service.',
      },
      {
        title: 'Fast delivery',
        description: `Hot meals from ${name} across Viman Nagar and nearby Pune pin codes.`,
      },
      {
        title: 'Hygienic kitchen',
        description:
          'FSSAI-licensed kitchen with dine-in, takeaway, and online ordering.',
      },
    ]
  }

  return whyChooseUsItems.map((item) =>
    item.title === 'Fast delivery'
      ? {
          ...item,
          description: `Hot meals from ${name}, prepared fresh for delivery and pickup.`,
        }
      : item,
  )
}

/** Dummy testimonials removed — use per-org Google reviews instead. */
export function storefrontTestimonials(_org: OrganizationContextValue) {
  return [] as Array<{
    id: string
    name: string
    rating: number
    quote: string
    location: string
  }>
}

export function storefrontCategoriesSubtitle(org: OrganizationContextValue) {
  if (isSpiceMalabar(org)) {
    return 'Kerala, South Indian, North Indian and Indo-Chinese favourites'
  }
  if (org.resolvedFromHost && org.name) {
    return `Browse the ${org.name} menu by category`
  }
  return 'Browse our menu by your favorite Andhra specialties'
}

export function categoryImageFallback(
  slug: string,
  imageUrl: string | null,
  orgSlug: string | null,
): string {
  const remote =
    imageUrl && !isAndhraLocalAsset(imageUrl)
      ? optimizeMenuImage(imageUrl, 480)
      : null
  if (remote) return remote
  if (orgSlug && !isTasteOfAndhraSlug(orgSlug)) return SPICE_MALABAR_HERO
  return (
    {
      starters: LOCAL_IMAGES.categories.starters,
      biryani: LOCAL_IMAGES.categories.biryani,
      curries: LOCAL_IMAGES.categories.curries,
      breads: LOCAL_IMAGES.categories.breads,
      beverages: LOCAL_IMAGES.categories.beverages,
      desserts: LOCAL_IMAGES.categories.desserts,
    }[slug] ?? LOCAL_IMAGES.hero
  )
}

export function dishImageFallback(
  imageUrl: string | null | undefined,
  orgSlug: string | null,
): string {
  const remote =
    imageUrl && !isAndhraLocalAsset(imageUrl)
      ? optimizeMenuImage(imageUrl, 400)
      : null
  if (remote) return remote
  if (orgSlug && !isTasteOfAndhraSlug(orgSlug)) return SPICE_MALABAR_HERO
  return LOCAL_IMAGES.hero
}

function mapsUrlFor(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

function mapsUrlFromOrg(org: OrganizationContextValue, address: string): string {
  const savedMaps =
    typeof org.settings[GOOGLE_MAPS_URL_SETTING_KEY] === 'string'
      ? String(org.settings[GOOGLE_MAPS_URL_SETTING_KEY]).trim()
      : ''
  const reviews = googleReviewsFromSettings(org.settings)
  const spiceDefault = isSpiceMalabar(org) ? SPICE_MALABAR_MAPS_URL : ''

  return (
    googleMapsDirectionsUrl({
      mapsUrl: savedMaps || spiceDefault || null,
      placeId: reviews.placeId || (isSpiceMalabar(org)
        ? CHOPSTICKS_SPICE_MALABAR_GOOGLE_PLACE_REF
        : null),
      address,
    }) || mapsUrlFor(address)
  )
}

function publicEmail(email: string | null | undefined): string | null {
  const value = email?.trim()
  if (!value) return null
  if (value.endsWith('.test') || value.endsWith('.example')) return null
  return value
}

export interface StorefrontContact {
  name: string
  tagline: string
  description: string
  phone: string
  alternatePhone: string | null
  phones: string[]
  /** Dedicated WhatsApp number for click-to-order and customer handoffs. */
  whatsappPhone: string | null
  email: string | null
  address: string
  mapsUrl: string
  weekdayHours: string
  weekendHours: string
}

export function storefrontContact(
  org: OrganizationContextValue,
): StorefrontContact {
  if (isSpiceMalabar(org) || (org.resolvedFromHost && org.slug)) {
    const spice = isSpiceMalabar(org)
    const phone =
      org.phone?.trim() || (spice ? SPICE_MALABAR_CONTACT.phone : '')
    const alternate =
      org.alternatePhone?.trim() ||
      (spice ? SPICE_MALABAR_CONTACT.alternatePhone : '')
    const phones = [phone, alternate].filter(Boolean)
    const whatsappPhone = restaurantWhatsAppPhoneFromSettings(org.settings)
    const address =
      org.address?.trim() ||
      (spice ? SPICE_MALABAR_CONTACT.address : CONTACT.address)
    const weekdayHours =
      org.weekdayHours?.trim() ||
      (spice ? SPICE_MALABAR_CONTACT.weekdayHours : OPENING_HOURS.weekdays)
    const weekendHours =
      org.weekendHours?.trim() ||
      (spice ? SPICE_MALABAR_CONTACT.weekendHours : OPENING_HOURS.weekends)

    return {
      name: restaurantDisplayName(org),
      tagline:
        org.tagline?.trim() ||
        (spice ? SPICE_MALABAR_CONTACT.tagline : 'Order online'),
      description:
        org.description?.trim() ||
        (spice ? SPICE_MALABAR_CONTACT.description : ''),
      phone: phone || (spice ? SPICE_MALABAR_CONTACT.phone : ''),
      alternatePhone: alternate || null,
      phones: phones.length > 0 ? phones : spice ? [SPICE_MALABAR_CONTACT.phone] : [],
      whatsappPhone,
      email: publicEmail(org.email),
      address,
      mapsUrl: mapsUrlFromOrg(org, address),
      weekdayHours,
      weekendHours,
    }
  }

  return {
    name: restaurantDisplayName(org),
    tagline: org.tagline?.trim() || 'Authentic Andhra Cuisine',
    description: org.description?.trim() || APP_DESCRIPTION,
    phone: CONTACT.phone,
    alternatePhone: null,
    phones: [CONTACT.phone],
    whatsappPhone: restaurantWhatsAppPhoneFromSettings(org.settings),
    email: CONTACT.email,
    address: CONTACT.address,
    mapsUrl: CONTACT.mapsDirectionsUrl,
    weekdayHours: OPENING_HOURS.weekdays,
    weekendHours: OPENING_HOURS.weekends,
  }
}

export interface StorefrontSocialLink {
  label: string
  href: string
}

export function storefrontSocialLinks(
  org: OrganizationContextValue,
): StorefrontSocialLink[] {
  const branding = org.branding || {}
  const fromBranding: StorefrontSocialLink[] = [
    ['Instagram', branding.instagram_url],
    ['Facebook', branding.facebook_url],
    ['Twitter', branding.twitter_url],
  ]
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && /^https?:\/\//i.test(entry[1]),
    )
    .map(([label, href]) => ({ label, href }))

  if (fromBranding.length > 0) return fromBranding

  if (isTasteOfAndhraSlug(org.slug) || (!org.slug && !org.resolvedFromHost)) {
    return [
      { label: 'Instagram', href: 'https://instagram.com' },
      { label: 'Facebook', href: 'https://facebook.com' },
      { label: 'Twitter', href: 'https://twitter.com' },
    ]
  }

  return []
}

