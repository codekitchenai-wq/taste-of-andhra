import { requirementClosure } from '@/constants/FEATURES'
import { ROUTES } from '@/constants/ROUTES'

/** Starter plan seeded in saas_multi_tenant_model.sql */
export const STARTER_PLAN_ID = 'b0000000-0000-4000-8000-000000000001'

export const DEFAULT_TRIAL_DAYS = 30

export type BillingMode = 'trial' | 'paid'
export type BillingCycle = 'monthly' | 'yearly'

export const PAID_PERIOD_DAYS: Record<BillingCycle, number> = {
  monthly: 30,
  yearly: 365,
}

export function subscriptionPeriodDays(
  mode: BillingMode,
  trialDays: number,
  cycle: BillingCycle = 'monthly',
): number {
  if (mode === 'paid') return PAID_PERIOD_DAYS[cycle]
  return Math.max(1, trialDays || DEFAULT_TRIAL_DAYS)
}

export const ADDON_FEATURE_OPTIONS = [
  { key: 'branches', name: 'Multi-branch' },
  { key: 'qr_tables', name: 'QR tables' },
  { key: 'party_inquiries', name: 'Party inquiries' },
  { key: 'delivery_pidge', name: 'Pidge delivery' },
  { key: 'loyalty', name: 'Loyalty' },
  { key: 'whatsapp_notifications', name: 'WhatsApp notifications' },
  { key: 'whatsapp_ordering', name: 'WhatsApp ordering' },
  { key: 'sms_notifications', name: 'SMS notifications' },
] as const

export const ONBOARDING_PACK_FILES = {
  profile: '/onboarding/RESTAURANT_PROFILE_TEMPLATE.md',
  setup: '/onboarding/RESTAURANT_SETUP_TEMPLATE.csv',
  menu: '/onboarding/MENU_IMPORT_TEMPLATE.csv',
} as const

export function expandSelectedAddons(selected: string[]): string[] {
  const keys = new Set<string>()
  for (const key of selected) {
    keys.add(key)
    for (const required of requirementClosure(key)) {
      if (ADDON_FEATURE_OPTIONS.some((option) => option.key === required)) {
        keys.add(required)
      }
    }
  }
  return [...keys]
}

export function buildOwnerWhatsAppMessage(input: {
  restaurantName: string
  ownerEmail: string
  temporaryPassword?: string | null
  existingUser?: boolean
  adminLoginUrl: string
  homepageUrl?: string | null
}): string {
  const passwordLine = input.existingUser
    ? `Use your existing password with ${input.ownerEmail}.`
    : input.temporaryPassword
      ? `Email: ${input.ownerEmail}\nTemporary password: ${input.temporaryPassword}`
      : `Email: ${input.ownerEmail}\nWe will send a login separately.`
  const homepageLine = input.homepageUrl
    ? `\nCustomer homepage:\n${input.homepageUrl}\n`
    : ''

  return `Welcome — restaurant setup (15–30 minutes)

We created *${input.restaurantName}* on our platform. You keep control of name, address, GST, FSSAI, and menu.
${homepageLine}
Please send us / fill:
1. Restaurant setup sheet — address, GSTIN, FSSAI, hours, UPI, delivery pincodes (CSV attached). Change only the value column.
2. Menu spreadsheet — one row per dish (CSV attached).
3. Logo (optional) — square PNG/JPG.

Admin login:
${input.adminLoginUrl}
${passwordLine}

Tips for the menu sheet
- One dish per row.
- Price as number only (e.g. 249, not ₹249).
- Mark veg correctly (TRUE / FALSE).
- Skip photos for now; add them later in Admin.

What happens next
1. We load your setup sheet + menu.
2. You check everything in Admin.
3. We place one test order.
4. We switch you live.

After go-live: update menu anytime in Admin → Dishes / Categories.`
}

export function adminLoginUrl(origin = window.location.origin): string {
  return `${origin}${ROUTES.ADMIN.LOGIN}`
}
