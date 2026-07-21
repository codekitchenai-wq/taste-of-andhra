const INDIAN_PHONE_PATTERN = /^\d{10}$/

/** Strip formatting and return 10-digit Indian mobile, or null if invalid. */
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')

  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2)
    return INDIAN_PHONE_PATTERN.test(local) ? local : null
  }

  if (digits.length === 10 && INDIAN_PHONE_PATTERN.test(digits)) {
    return digits
  }

  return null
}

/** Format a 10-digit Indian mobile number to E.164 (+91…). */
export function toE164IndianPhone(phone: string): string {
  const normalized = normalizeIndianPhone(phone)

  if (!normalized) {
    throw new Error('Invalid phone number')
  }

  return `+91${normalized}`
}

/** Display-friendly format: 98765 43210 */
export function formatIndianPhone(phone: string): string {
  const normalized = normalizeIndianPhone(phone)
  if (!normalized) return phone
  return `${normalized.slice(0, 5)} ${normalized.slice(5)}`
}
