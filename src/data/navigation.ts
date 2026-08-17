import { ROUTES } from '@/constants/ROUTES'

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

/** TEMPORARY — persona entry points for QA. Gated by SHOW_TEST_HELPERS. */
export const footerTestPersonaLinks: NavLink[] = [
  { label: 'Superuser / Master login', to: ROUTES.MASTER.LOGIN },
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
