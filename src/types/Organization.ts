export type OrganizationStatus =
  | 'active'
  | 'trialing'
  | 'suspended'
  | 'cancelled'

export type OnboardingStatus =
  | 'intake'
  | 'pending_setup'
  | 'pending_review'
  | 'live'
  | 'rejected'

export type OrganizationMemberRole =
  | 'restaurant_owner'
  | 'restaurant_admin'
  | 'delivery'

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'suspended'

export type EntitlementSource = 'plan' | 'addon' | 'manual'

export type HomepageMode =
  | 'platform_subdomain'
  | 'custom_domain'
  | 'external_link'
  | 'set_later'

export interface TenantHomepage {
  mode: HomepageMode
  customDomain: string | null
  homepageUrl: string
}

export type SetOrgFeatureCode = 'CORE_FEATURE' | 'DEPENDENTS_ENABLED'

/** Coarse feature module keys (see SAAS_MULTI_TENANT_ARCHITECTURE.md §4.3). */
export type FeatureKey =
  | 'menu'
  | 'orders'
  | 'customers'
  | 'offers'
  | 'reports'
  | 'settings'
  | 'delivery_own'
  | 'branches'
  | 'qr_tables'
  | 'party_inquiries'
  | 'delivery_pidge'
  | 'loyalty'
  | 'whatsapp_notifications'
  | 'whatsapp_ordering'
  | 'sms_notifications'
  | 'payments_direct_upi'
  | 'payments_razorpay'
  | 'ai_menu_import'

export interface OrganizationBranding {
  logo_url?: string | null
  primary_color?: string | null
  hero_url?: string | null
  [key: string]: unknown
}

export interface OrganizationGallery {
  front?: string | null
  interior?: string | null
  food?: string | null
}

export interface OrganizationOpeningHours {
  weekdays?: string
  weekends?: string
  [key: string]: unknown
}

export interface Organization {
  id: string
  name: string
  slug: string
  status: OrganizationStatus
  legal_name: string | null
  branding: OrganizationBranding
  tagline: string | null
  description: string | null
  phone: string | null
  email: string | null
  address: string | null
  opening_hours: OrganizationOpeningHours
  gstin: string | null
  fssai_license: string | null
  fssai_valid_until: string | null
  fssai_certificate_url: string | null
  onboarding_status: OnboardingStatus | null
  homepage_mode: HomepageMode
  custom_domain: string | null
  homepage_url: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationMemberRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Feature {
  key: FeatureKey | string
  name: string
  description: string | null
  is_add_on: boolean
  is_core: boolean
  default_enabled: boolean
  display_order: number
  created_at: string
}

export interface FeatureDependency {
  feature_key: FeatureKey | string
  requires_feature_key: FeatureKey | string
}

export interface MasterOrganizationSummary {
  id: string
  name: string
  slug: string
  status: OrganizationStatus
  subscription_active: boolean
  homepage: TenantHomepage
}

export interface OrgFeatureState {
  feature_key: FeatureKey | string
  name: string
  description: string | null
  is_add_on: boolean
  is_core: boolean
  default_enabled: boolean
  display_order: number
  enabled: boolean
  source: EntitlementSource | null
  requires: string[]
  enabled_dependents: string[]
}

export interface SetOrgFeatureResult {
  ok: boolean
  feature_key: string
  enabled: boolean
  changed: string[]
  already_set: string[]
  blocked_by?: string[]
  code?: SetOrgFeatureCode
  message?: string
}

export interface Plan {
  id: string
  code: string
  name: string
  description: string | null
  price_monthly: number
  price_yearly: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PlanFeature {
  id: string
  plan_id: string
  feature_key: FeatureKey | string
}

export interface Subscription {
  id: string
  organization_id: string
  plan_id: string
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  provider: string | null
  provider_ref: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationEntitlement {
  id: string
  organization_id: string
  feature_key: FeatureKey | string
  enabled: boolean
  source: EntitlementSource
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationFormInput {
  name: string
  slug: string
  tagline?: string
  description?: string
  phone?: string
  email?: string
  address?: string
  gstin?: string
  fssaiLicense?: string
  openingHours?: OrganizationOpeningHours
  branding?: OrganizationBranding
}
