import {
  LayoutDashboard,
  FolderOpen,
  UtensilsCrossed,
  ShoppingBag,
  Users,
  Truck,
  Tag,
  BarChart3,
  Settings,
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
  { label: 'Offers', to: ROUTES.ADMIN.OFFERS, icon: Tag },
  { label: 'Reports', to: ROUTES.ADMIN.REPORTS, icon: BarChart3 },
  { label: 'Settings', to: ROUTES.ADMIN.SETTINGS, icon: Settings },
]
