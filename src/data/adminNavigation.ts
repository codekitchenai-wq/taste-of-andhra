import {
  LayoutDashboard,
  FolderOpen,
  UtensilsCrossed,
  ShoppingBag,
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

export const adminNavItems: AdminNavItem[] = [
  { label: 'Dashboard', to: ROUTES.ADMIN.DASHBOARD, icon: LayoutDashboard },
  { label: 'Categories', to: ROUTES.ADMIN.CATEGORIES, icon: FolderOpen },
  { label: 'Dishes', to: ROUTES.ADMIN.DISHES, icon: UtensilsCrossed },
  { label: 'Orders', to: ROUTES.ADMIN.ORDERS, icon: ShoppingBag },
  { label: 'Customers', to: ROUTES.ADMIN.CUSTOMERS, icon: Users },
  { label: 'Delivery', to: ROUTES.ADMIN.DELIVERY, icon: Truck },
  {
    label: 'Delivery Partners',
    to: ROUTES.ADMIN.DELIVERY_PARTNERS,
    icon: Bike,
  },
  { label: 'Offers', to: ROUTES.ADMIN.OFFERS, icon: Tag },
  { label: 'Party Inquiries', to: ROUTES.ADMIN.PARTY_INQUIRIES, icon: PartyPopper },
  { label: 'Branches', to: ROUTES.ADMIN.BRANCHES, icon: Store },
  { label: 'QR Tables', to: ROUTES.ADMIN.QR_TABLES, icon: QrCode },
  { label: 'Reports', to: ROUTES.ADMIN.REPORTS, icon: BarChart3 },
  { label: 'Settings', to: ROUTES.ADMIN.SETTINGS, icon: Settings },
]
