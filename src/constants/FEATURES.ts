/** Core modules cannot be turned off by Master. */
export const CORE_FEATURE_KEYS = [
  'menu',
  'orders',
  'customers',
  'settings',
] as const

export type CoreFeatureKey = (typeof CORE_FEATURE_KEYS)[number]

/** feature_key → modules that must also be on. */
export const FEATURE_REQUIREMENTS: Record<string, readonly string[]> = {
  whatsapp_ordering: ['whatsapp_notifications', 'orders', 'menu'],
  whatsapp_notifications: ['orders'],
  sms_notifications: ['orders'],
  delivery_pidge: ['delivery_own'],
  qr_tables: ['menu', 'orders'],
  loyalty: ['customers'],
  payments_razorpay: ['orders'],
  payments_direct_upi: ['orders'],
}

export function isCoreFeature(key: string): boolean {
  return (CORE_FEATURE_KEYS as readonly string[]).includes(key)
}

export function requirementClosure(featureKey: string): string[] {
  const seen = new Set<string>()
  const queue = [featureKey]
  while (queue.length > 0) {
    const key = queue.shift()
    if (!key || seen.has(key)) continue
    seen.add(key)
    const required = FEATURE_REQUIREMENTS[key] ?? []
    for (const next of required) queue.push(next)
  }
  return [...seen]
}

export function dependentClosure(featureKey: string): string[] {
  const dependents: string[] = []
  const seen = new Set<string>([featureKey])
  const queue = [featureKey]
  while (queue.length > 0) {
    const key = queue.shift()
    if (!key) continue
    for (const [candidate, required] of Object.entries(FEATURE_REQUIREMENTS)) {
      if (required.includes(key) && !seen.has(candidate)) {
        seen.add(candidate)
        dependents.push(candidate)
        queue.push(candidate)
      }
    }
  }
  return dependents
}
