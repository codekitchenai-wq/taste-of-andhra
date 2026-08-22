import { ROUTES } from '@/constants/ROUTES'
import type { OrganizationContextValue } from '@/contexts/OrganizationContext'
import {
  isSpiceMalabarStorefront,
  storefrontPartyOrdersEnabled,
  storefrontPublicMenuEnabled,
} from '@/utils/storefrontCopy'

export interface NavLink {
  label: string
  to: string
}

export const mainNavLinks: NavLink[] = [
  { label: 'Home', to: ROUTES.HOME },
  { label: 'Menu', to: ROUTES.MENU },
  { label: 'About', to: ROUTES.ABOUT },
  { label: 'Gallery', to: ROUTES.GALLERY },
  { label: 'Party Orders', to: ROUTES.PARTY_ORDER },
  { label: 'Contact', to: ROUTES.CONTACT },
]

export const onamSpecialNavLink: NavLink = {
  label: 'Onam Special',
  to: ROUTES.ONAM,
}

export const footerQuickLinks: NavLink[] = [
  { label: 'Home', to: ROUTES.HOME },
  { label: 'Menu', to: ROUTES.MENU },
  { label: 'Light Menu', to: ROUTES.LIGHT_MENU },
  { label: 'About Us', to: ROUTES.ABOUT },
  { label: 'Gallery', to: ROUTES.GALLERY },
  { label: 'Party Orders', to: ROUTES.PARTY_ORDER },
  { label: 'Contact', to: ROUTES.CONTACT },
  { label: 'Privacy Policy', to: ROUTES.PRIVACY },
]

function filterDisabledStorefrontLinks(
  links: NavLink[],
  org: OrganizationContextValue,
): NavLink[] {
  const menuOn = storefrontPublicMenuEnabled(org)
  const partyOn = storefrontPartyOrdersEnabled(org)
  return links.filter((link) => {
    if (
      !menuOn &&
      (link.to === ROUTES.MENU || link.to === ROUTES.LIGHT_MENU)
    ) {
      return false
    }
    if (!partyOn && link.to === ROUTES.PARTY_ORDER) return false
    return true
  })
}

/** Main header links for the current restaurant host. */
export function storefrontMainNavLinks(
  org: OrganizationContextValue,
): NavLink[] {
  const base = isSpiceMalabarStorefront(org)
    ? [mainNavLinks[0], onamSpecialNavLink, ...mainNavLinks.slice(1)]
    : mainNavLinks
  return filterDisabledStorefrontLinks(base, org)
}

/** Footer quick links for the current restaurant host. */
export function storefrontFooterQuickLinks(
  org: OrganizationContextValue,
): NavLink[] {
  const base = isSpiceMalabarStorefront(org)
    ? [footerQuickLinks[0], onamSpecialNavLink, ...footerQuickLinks.slice(1)]
    : footerQuickLinks
  return filterDisabledStorefrontLinks(base, org)
}

/** TEMPORARY — persona entry points for QA. Gated by SHOW_TEST_HELPERS. */
export const footerTestPersonaLinks: NavLink[] = [
  { label: 'DirectApp Master login', to: ROUTES.MASTER.LOGIN },
  { label: 'Customer login', to: ROUTES.LOGIN },
  { label: 'Admin login', to: ROUTES.ADMIN.LOGIN },
  { label: 'Delivery login', to: ROUTES.DELIVERY.LOGIN },
  { label: 'Master dashboard', to: ROUTES.MASTER.DASHBOARD },
  { label: 'Admin dashboard', to: ROUTES.ADMIN.DASHBOARD },
  { label: 'Delivery dashboard', to: ROUTES.DELIVERY.DASHBOARD },
]

export const footerCustomerLinks: NavLink[] = [
  { label: 'My Orders', to: ROUTES.ORDERS },
  { label: 'Favorites', to: ROUTES.FAVORITES },
  { label: 'Notifications', to: ROUTES.NOTIFICATIONS },
  { label: 'Cart', to: ROUTES.CART },
  { label: 'Saved Addresses', to: ROUTES.ADDRESSES },
  { label: 'Profile', to: ROUTES.PROFILE },
]
