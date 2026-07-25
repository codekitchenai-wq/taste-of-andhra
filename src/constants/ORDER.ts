export const ORDER_TAX_RATE = 0.05
export const ORDER_DELIVERY_CHARGE = 49
export const FREE_DELIVERY_THRESHOLD = 399

/** Fallback when app_settings.default_eta_minutes is unavailable. */
export const DEFAULT_ETA_MINUTES = 45

/** Quick bump options shown on kitchen cards and order details. */
export const ETA_BUMP_MINUTES = [10, 15, 20] as const

export const ADDRESS_TYPES = [
  { label: 'Home', value: 'home' },
  { label: 'Work', value: 'work' },
  { label: 'Other', value: 'other' },
] as const
