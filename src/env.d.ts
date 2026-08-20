/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_RAZORPAY_KEY_ID?: string
  readonly VITE_PLATFORM_ROOT_DOMAIN?: string
  /** Force DirectApp marketing site (useful on localhost). */
  readonly VITE_FORCE_PLATFORM_SITE?: string
  readonly VITE_ENABLE_HOST_TENANT_RESOLUTION?: string
  readonly VITE_ENABLE_SCOPED_ORG_ADMIN_AUTH?: string
  readonly VITE_ENABLE_RAZORPAY_ROUTE?: string
  readonly VITE_ENABLE_META_EMBEDDED_SIGNUP?: string
  readonly VITE_ENABLE_AI?: string
  readonly VITE_ENABLE_STARTER_ONBOARDING?: string
  readonly VITE_UPI_VPA?: string
  readonly VITE_UPI_PAYEE_NAME?: string
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  readonly VITE_GOOGLE_PLACE_ID?: string
  readonly VITE_GOOGLE_REVIEWS_WIDGET_SRC?: string
  readonly VITE_GOOGLE_REVIEWS_WIDGET_CLASS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
