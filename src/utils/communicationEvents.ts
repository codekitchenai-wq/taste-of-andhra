import { ORDER_STATUS_EVENT_MAP } from '@/constants/COMMUNICATION'
import type { CommunicationEventType } from '@/types/Communication'

export function orderStatusToCommunicationEvent(
  orderStatus: string,
): CommunicationEventType {
  const mapped = ORDER_STATUS_EVENT_MAP[orderStatus]
  if (mapped) return mapped

  const normalized = orderStatus.trim().toUpperCase().replace(/\s+/g, '_')
  return normalized as CommunicationEventType
}

/**
 * Idempotency key: organization-scoped uniqueness is enforced by outbox UNIQUE(key).
 * Format: {orderId}:{eventType}:{channel}
 */
export function buildCommunicationIdempotencyKey(args: {
  orderId: string
  eventType: string
  channel: string
}): string {
  return `${args.orderId}:${args.eventType}:${args.channel}`
}

export function isPermanentCommunicationError(errorCode?: string | null): boolean {
  if (!errorCode) return false
  return [
    'invalid_phone',
    'invalid_template',
    'unauthorized',
    'forbidden',
    'blocked_recipient',
  ].includes(errorCode)
}

/** Exponential backoff minutes: 1, 2, 4… capped at 60. */
export function communicationRetryBackoffMinutes(attemptCount: number): number {
  return Math.min(60, Math.pow(2, Math.max(0, attemptCount - 1)))
}
