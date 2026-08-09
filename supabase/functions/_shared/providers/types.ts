// Provider-neutral communication contracts for Edge Functions.
// Business logic depends on these interfaces — never on Gupshup/Meta payloads.

export type CommunicationChannel = 'whatsapp' | 'sms' | 'email'

export type CommunicationProviderId =
  | 'mock'
  | 'meta_cloud'
  | 'gupshup'
  | 'msg91'
  | 'twilio'
  | 'bsp_other'
  | 'other'

export type NormalizedOutboxStatus =
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'

export interface SendMessageInput {
  organizationId: string
  channel: CommunicationChannel
  recipientE164: string
  templateName: string
  languageCode: string
  bodyParams: string[]
  eventType?: string | null
  metadata?: Record<string, unknown>
  /** Provider-specific credentials resolved by the dispatcher (never from frontend). */
  credentials?: Record<string, string>
}

export interface SendMessageResult {
  ok: boolean
  providerMessageId?: string
  errorCode?: string
  errorMessage?: string
  retryable?: boolean
  raw?: unknown
}

export interface WebhookNormalization {
  providerMessageId: string
  status: NormalizedOutboxStatus
  errorCode?: string
  errorMessage?: string
}

export interface WhatsAppProvider {
  readonly id: CommunicationProviderId
  sendTemplate(input: SendMessageInput): Promise<SendMessageResult>
  normalizeWebhook(payload: unknown): WebhookNormalization[]
}

export interface SmsProvider {
  readonly id: CommunicationProviderId
  sendTemplate(input: SendMessageInput): Promise<SendMessageResult>
  normalizeWebhook(payload: unknown): WebhookNormalization[]
}

/** Permanent failures must not be retried. */
export function isRetryableProviderError(
  errorCode?: string,
  httpHint?: number,
): boolean {
  const permanent = new Set([
    'invalid_phone',
    'invalid_template',
    'unauthorized',
    'forbidden',
    'blocked_recipient',
  ])
  if (errorCode && permanent.has(errorCode)) return false
  if (httpHint === 400 || httpHint === 401 || httpHint === 403 || httpHint === 404) {
    return false
  }
  return true
}

export function billingPeriodUtc(date = new Date()): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
