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

export const footerQuickLinks: NavLink[] = [
  { label: 'Home', to: ROUTES.HOME },
  { label: 'Menu', to: ROUTES.MENU },
  { label: 'About Us', to: ROUTES.ABOUT },
  { label: 'Gallery', to: ROUTES.GALLERY },
  { label: 'Party Orders', to: ROUTES.PARTY_ORDER },
  { label: 'Contact', to: ROUTES.CONTACT },
]

export const footerCustomerLinks: NavLink[] = [
  { label: 'My Orders', to: ROUTES.ORDERS },
  { label: 'Cart', to: ROUTES.CART },
  { label: 'Saved Addresses', to: ROUTES.ADDRESSES },
  { label: 'Profile', to: ROUTES.PROFILE },
]
