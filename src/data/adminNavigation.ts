import {
  LayoutDashboard,
  FolderOpen,
  UtensilsCrossed,
  ShoppingBag,
  Phone,
  Users,
  Truck,
  Bike,
  Tag,
  BarChart3,
  Settings,
  PartyPopper,
  Store,
  QrCode,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ROUTES } from '@/constants/ROUTES'

export interface AdminNavItem {
  label: string
  to: string
  icon: LucideIcon
}

/** Always visible — high-frequency kitchen / ops links. */
export const adminPrimaryNavItems: AdminNavItem[] = [
  { label: 'Dashboard', to: ROUTES.ADMIN.DASHBOARD, icon: LayoutDashboard },
  { label: 'Orders', to: ROUTES.ADMIN.ORDERS, icon: ShoppingBag },
  { label: 'Phone Order', to: ROUTES.ADMIN.PHONE_ORDER, icon: Phone },
  { label: 'Delivery', to: ROUTES.ADMIN.DELIVERY, icon: Truck },
  { label: 'Offers', to: ROUTES.ADMIN.OFFERS, icon: Tag },
]

/**
 * Collapsed under “More” by default — still reachable when expanded.
 * Ordered by typical admin usage after day-to-day ops.
 */
export const adminSecondaryNavItems: AdminNavItem[] = [
  { label: 'Dishes', to: ROUTES.ADMIN.DISHES, icon: UtensilsCrossed },
  { label: 'Categories', to: ROUTES.ADMIN.CATEGORIES, icon: FolderOpen },
  { label: 'Customers', to: ROUTES.ADMIN.CUSTOMERS, icon: Users },
  {
    label: 'Delivery Partners',
    to: ROUTES.ADMIN.DELIVERY_PARTNERS,
    icon: Bike,
  },
  { label: 'Reports', to: ROUTES.ADMIN.REPORTS, icon: BarChart3 },
  { label: 'Branches', to: ROUTES.ADMIN.BRANCHES, icon: Store },
  { label: 'QR Tables', to: ROUTES.ADMIN.QR_TABLES, icon: QrCode },
  { label: 'Party Inquiries', to: ROUTES.ADMIN.PARTY_INQUIRIES, icon: PartyPopper },
  { label: 'Settings', to: ROUTES.ADMIN.SETTINGS, icon: Settings },
]

/** Flat list for page titles / lookups. */
export const adminNavItems: AdminNavItem[] = [
  ...adminPrimaryNavItems,
  ...adminSecondaryNavItems,
]

export function isAdminSecondaryRoute(pathname: string): boolean {
  return adminSecondaryNavItems.some(
    (item) =>
      pathname === item.to || pathname.startsWith(`${item.to}/`),
  )
}
