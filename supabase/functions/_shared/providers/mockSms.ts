import type {
  SendMessageInput,
  SendMessageResult,
  SmsProvider,
  WebhookNormalization,
} from './types.ts'

function mockId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
}

/**
 * Dev/test SMS provider — no external API / DLT calls.
 */
export class MockSmsProvider implements SmsProvider {
  readonly id = 'mock' as const

  async sendTemplate(input: SendMessageInput): Promise<SendMessageResult> {
    if (input.metadata?.force_fail === true) {
      return {
        ok: false,
        errorCode: 'mock_forced_failure',
        errorMessage: 'Mock SMS provider forced failure.',
        retryable: true,
      }
    }

    const phone = input.recipientE164?.replace(/\D/g, '') ?? ''
    if (phone.length < 10) {
      return {
        ok: false,
        errorCode: 'invalid_phone',
        errorMessage: 'Invalid recipient phone.',
        retryable: false,
      }
    }

    if (!input.templateName?.trim()) {
      return {
        ok: false,
        errorCode: 'invalid_template',
        errorMessage: 'Template name is required.',
        retryable: false,
      }
    }

    return {
      ok: true,
      providerMessageId: mockId('mock_sms'),
    }
  }

  normalizeWebhook(payload: unknown): WebhookNormalization[] {
    if (!payload || typeof payload !== 'object') return []
    const body = payload as {
      providerMessageId?: string
      status?: string
      errorCode?: string
      errorMessage?: string
    }
    if (!body.providerMessageId || !body.status) return []
    const status = body.status as WebhookNormalization['status']
    if (!['sent', 'delivered', 'read', 'failed'].includes(status)) return []
    return [
      {
        providerMessageId: body.providerMessageId,
        status,
        errorCode: body.errorCode,
        errorMessage: body.errorMessage,
      },
    ]
  }
}
