import type { OrderNumberSequenceSettings } from '@/types/OrderNumberSequence'
import { DEFAULT_ORDER_NUMBER_SEQUENCE } from '@/types/OrderNumberSequence'

export function normalizeOrderPrefix(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return cleaned || DEFAULT_ORDER_NUMBER_SEQUENCE.prefix
}

export function parseOrderNumberSequence(
  raw: unknown,
): OrderNumberSequenceSettings | null {
  if (raw == null) return null

  let value: unknown = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    try {
      value = JSON.parse(trimmed) as unknown
    } catch {
      return null
    }
  }

  if (!value || typeof value !== 'object') return null
  const obj = value as Record<string, unknown>
  const prefix =
    typeof obj.prefix === 'string'
      ? normalizeOrderPrefix(obj.prefix)
      : DEFAULT_ORDER_NUMBER_SEQUENCE.prefix

  return {
    prefix,
    includeDate:
      typeof obj.includeDate === 'boolean'
        ? obj.includeDate
        : DEFAULT_ORDER_NUMBER_SEQUENCE.includeDate,
  }
}

export function validateOrderNumberSequence(
  settings: OrderNumberSequenceSettings,
): string | null {
  const prefix = normalizeOrderPrefix(settings.prefix)
  if (prefix.length < 2 || prefix.length > 8) {
    return 'Prefix must be 2–8 letters or numbers.'
  }
  return null
}

export function generateOrderNumber(
  settings: OrderNumberSequenceSettings = DEFAULT_ORDER_NUMBER_SEQUENCE,
): string {
  const prefix = normalizeOrderPrefix(settings.prefix)
  const random = Math.floor(1000 + Math.random() * 9000)

  if (settings.includeDate) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return `${prefix}-${datePart}-${random}`
  }

  return `${prefix}-${random}`
}

export function splitOrderNumber(value: string): {
  prefix: string
  sequence: string
} {
  const trimmed = value.trim()
  if (!trimmed) return { prefix: '', sequence: '' }
  if (trimmed.length <= 4) return { prefix: '', sequence: trimmed }
  return {
    prefix: trimmed.slice(0, -4),
    sequence: trimmed.slice(-4),
  }
}

export function previewOrderNumber(
  settings: OrderNumberSequenceSettings,
): string {
  return generateOrderNumber(settings).replace(/\d{4}$/, '4827')
}
