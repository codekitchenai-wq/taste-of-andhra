import {
  Bell,
  ClipboardList,
  Heart,
  MapPin,
  User,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ROUTES } from '@/constants/ROUTES'

export interface AccountNavItem {
  label: string
  to: string
  icon: LucideIcon
  description: string
}

export const accountNavItems: AccountNavItem[] = [
  {
    label: 'My Orders',
    to: ROUTES.ORDERS,
    icon: ClipboardList,
    description: 'Track current and past orders.',
  },
  {
    label: 'Profile',
    to: ROUTES.PROFILE,
    icon: User,
    description: 'Name, phone, and loyalty.',
  },
  {
    label: 'Addresses',
    to: ROUTES.ADDRESSES,
    icon: MapPin,
    description: 'Home, work, and other saved places.',
  },
  {
    label: 'Favorites',
    to: ROUTES.FAVORITES,
    icon: Heart,
    description: 'Dishes you saved for later.',
  },
  {
    label: 'Notifications',
    to: ROUTES.NOTIFICATIONS,
    icon: Bell,
    description: 'Order updates and alerts.',
  },
]

export function getAccountPageMeta(pathname: string): AccountNavItem {
  const match = accountNavItems.find((item) =>
    item.to === ROUTES.ORDERS
      ? pathname === ROUTES.ORDERS
      : pathname === item.to || pathname.startsWith(`${item.to}/`),
  )
  return match ?? accountNavItems[0]
}
