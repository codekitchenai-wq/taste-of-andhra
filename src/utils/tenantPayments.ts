import { isDefaultAndhraTenant } from '@/utils/tenantFeatures'

export const RAZORPAY_KEY_SETTING = 'razorpay_key_id'

function envRazorpayKeyId(): string | undefined {
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim()
  if (!key || key.includes('your_razorpay')) return undefined
  return key
}

/** Publishable Razorpay key for this restaurant only — never inherit another tenant. */
export function razorpayKeyIdForTenant(input: {
  settings?: Record<string, unknown> | null
  slug?: string | null
  organizationId?: string | null
}): string | undefined {
  const fromOrg =
    typeof input.settings?.[RAZORPAY_KEY_SETTING] === 'string'
      ? String(input.settings[RAZORPAY_KEY_SETTING]).trim()
      : ''
  if (fromOrg && !fromOrg.includes('your_razorpay')) return fromOrg
  if (isDefaultAndhraTenant(input)) return envRazorpayKeyId()
  return undefined
}

export function envUpiFallback(input: {
  slug?: string | null
  organizationId?: string | null
}): { vpa: string; payeeName: string } {
  if (!isDefaultAndhraTenant(input)) {
    return { vpa: '', payeeName: '' }
  }
  return {
    vpa: import.meta.env.VITE_UPI_VPA?.trim() ?? '',
    payeeName: import.meta.env.VITE_UPI_PAYEE_NAME?.trim() ?? '',
  }
}
