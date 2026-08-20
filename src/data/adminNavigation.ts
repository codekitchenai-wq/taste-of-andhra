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
  Leaf,
  Sparkles,
  ClipboardList,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ROUTES } from '@/constants/ROUTES'
import type { OrganizationContextValue } from '@/contexts/OrganizationContext'
import { isSpiceMalabarStorefront } from '@/utils/storefrontCopy'
import { isWebsiteStarterTrack } from '@/utils/websiteStarter'

export interface AdminNavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Shown once in the top bar — do not repeat as a page H2. */
  description?: string
}

/** Always visible — high-frequency kitchen / ops links. */
export const adminPrimaryNavItems: AdminNavItem[] = [
  {
    label: 'Dashboard',
    to: ROUTES.ADMIN.DASHBOARD,
    icon: LayoutDashboard,
    description:
      'Today’s performance by default — switch duration or pick a custom date range for broader insights.',
  },
  {
    label: 'Orders',
    to: ROUTES.ADMIN.ORDERS,
    icon: ShoppingBag,
    description: 'Kitchen board for accepting and progressing live orders.',
  },
  {
    label: 'Phone / Counter Order',
    to: ROUTES.ADMIN.PHONE_ORDER,
    icon: Phone,
    description:
      'Create an order from a phone call or walk-in. Goes to Confirmed; pay later via UPI QR.',
  },
  {
    label: 'Delivery',
    to: ROUTES.ADMIN.DELIVERY,
    icon: Truck,
    description: 'Assign delivery partners and track active deliveries.',
  },
  {
    label: 'Offers',
    to: ROUTES.ADMIN.OFFERS,
    icon: Tag,
    description: 'Create and manage promotional offers and coupons.',
  },
]

export const adminOnamNavItem: AdminNavItem = {
  label: 'Onam Sadhya',
  to: ROUTES.ADMIN.ONAM_ORDERS,
  icon: Leaf,
  description:
    'Pre-booked Onam Sadhya orders by celebration day, delivery slot, and payment status.',
}

export function getAdminPrimaryNavItems(
  org: OrganizationContextValue,
): AdminNavItem[] {
  if (isWebsiteStarterTrack(org.settings)) {
    return [
      {
        label: 'Setup',
        to: ROUTES.ADMIN.SETUP,
        icon: ClipboardList,
        description: 'Complete profile, photos, and menu for Website Starter.',
      },
      {
        label: 'Starter tools',
        to: ROUTES.ADMIN.STARTER_TOOLS,
        icon: Sparkles,
        description: 'QR, share, SEO checklist, and basic analytics.',
      },
      {
        label: 'Dishes',
        to: ROUTES.ADMIN.DISHES,
        icon: UtensilsCrossed,
        description: 'Edit menu items (up to 15 on Website Starter).',
      },
      {
        label: 'Categories',
        to: ROUTES.ADMIN.CATEGORIES,
        icon: FolderOpen,
        description: 'Organize menu categories.',
      },
      {
        label: 'Settings',
        to: ROUTES.ADMIN.SETTINGS,
        icon: Settings,
        description: 'Restaurant configuration.',
      },
    ]
  }

  if (!isSpiceMalabarStorefront(org)) {
    return adminPrimaryNavItems
  }

  const items = [...adminPrimaryNavItems]
  items.splice(2, 0, adminOnamNavItem)
  return items
}

/**
 * Collapsed under “More” by default — still reachable when expanded.
 * Ordered by typical admin usage after day-to-day ops.
 */
export const adminSecondaryNavItems: AdminNavItem[] = [
  {
    label: 'Dishes',
    to: ROUTES.ADMIN.DISHES,
    icon: UtensilsCrossed,
    description: 'Manage menu items — pricing, availability, and images.',
  },
  {
    label: 'Categories',
    to: ROUTES.ADMIN.CATEGORIES,
    icon: FolderOpen,
    description: 'Manage menu categories — add, edit, and organize dishes.',
  },
  {
    label: 'Customers',
    to: ROUTES.ADMIN.CUSTOMERS,
    icon: Users,
    description: 'Search customers and manage account access.',
  },
  {
    label: 'Delivery Partners',
    to: ROUTES.ADMIN.DELIVERY_PARTNERS,
    icon: Bike,
    description:
      'Maintain delivery partners by branch for assignment on ready orders.',
  },
  {
    label: 'Reports',
    to: ROUTES.ADMIN.REPORTS,
    icon: BarChart3,
    description:
      'Daily, weekly, and monthly sales with revenue and popular dish insights.',
  },
  {
    label: 'Branches',
    to: ROUTES.ADMIN.BRANCHES,
    icon: Store,
    description:
      'Manage restaurant locations, contact details, and GST information.',
  },
  {
    label: 'QR Tables',
    to: ROUTES.ADMIN.QR_TABLES,
    icon: QrCode,
    description: 'Generate table QR codes for scan-to-order menus.',
  },
  {
    label: 'Party Inquiries',
    to: ROUTES.ADMIN.PARTY_INQUIRIES,
    icon: PartyPopper,
    description: 'Review and follow up on party order enquiries from customers.',
  },
  {
    label: 'Settings',
    to: ROUTES.ADMIN.SETTINGS,
    icon: Settings,
    description: 'Restaurant configuration and platform status.',
  },
  {
    label: 'Setup wizard',
    to: ROUTES.ADMIN.SETUP,
    icon: ClipboardList,
    description: 'Website Starter onboarding wizard.',
  },
  {
    label: 'Starter tools',
    to: ROUTES.ADMIN.STARTER_TOOLS,
    icon: Sparkles,
    description: 'QR, share, SEO, and starter analytics.',
  },
]

/** Flat list for page titles / lookups. */
export const adminNavItems: AdminNavItem[] = [
  ...adminPrimaryNavItems,
  adminOnamNavItem,
  ...adminSecondaryNavItems,
]

/** Resolve top-bar title/description for the current admin URL. */
export function getAdminPageMeta(pathname: string): {
  title: string
  description?: string
} {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname

  // Longest path wins so `/admin` never steals `/admin/orders`, etc.
  const match = [...adminNavItems]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => {
      if (normalized === item.to) return true
      // Dashboard (`/admin`) is exact-only — never a prefix match.
      if (item.to === ROUTES.ADMIN.DASHBOARD) return false
      return normalized.startsWith(`${item.to}/`)
    })

  if (match) {
    return { title: match.label, description: match.description }
  }

  return { title: 'Admin' }
}

export function isAdminSecondaryRoute(pathname: string): boolean {
  return adminSecondaryNavItems.some(
    (item) =>
      pathname === item.to || pathname.startsWith(`${item.to}/`),
  )
}
