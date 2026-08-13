import { ORDER_TAX_RATE } from '@/constants/ORDER'
import {
  DEFAULT_GST_SETTINGS,
  type GstSettings,
} from '@/constants/GST'

const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export function normalizeGstin(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export function isValidGstin(raw: string): boolean {
  const gstin = normalizeGstin(raw)
  return gstin.length === 15 && GSTIN_PATTERN.test(gstin)
}

export function parseGstSettings(raw: unknown): GstSettings {
  if (raw == null) return { ...DEFAULT_GST_SETTINGS }

  let value: unknown = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return { ...DEFAULT_GST_SETTINGS }
    if (trimmed === 'true' || trimmed === 'false') {
      return { enabled: trimmed === 'true', gstin: '' }
    }
    try {
      value = JSON.parse(trimmed) as unknown
    } catch {
      return { ...DEFAULT_GST_SETTINGS }
    }
  }

  if (!value || typeof value !== 'object') return { ...DEFAULT_GST_SETTINGS }

  const obj = value as Record<string, unknown>
  const gstin =
    typeof obj.gstin === 'string' ? normalizeGstin(obj.gstin) : ''

  return {
    enabled: Boolean(obj.enabled),
    gstin,
  }
}

export function effectiveOrderTaxRate(gstEnabled: boolean): number {
  return gstEnabled ? ORDER_TAX_RATE : 0
}
