/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_RAZORPAY_KEY_ID?: string
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
