import {
  mapMetaStatusToOutbox,
  sendWhatsAppTemplate,
} from '../whatsapp.ts'
import type {
  SendMessageInput,
  SendMessageResult,
  WebhookNormalization,
  WhatsAppProvider,
} from './types.ts'
import { isRetryableProviderError } from './types.ts'

/**
 * Meta Cloud API WhatsApp adapter.
 * Wraps existing Graph helpers — keeps Meta details out of business logic.
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly id = 'meta_cloud' as const

  async sendTemplate(input: SendMessageInput): Promise<SendMessageResult> {
    const phoneNumberId = input.credentials?.phoneNumberId
    const accessToken = input.credentials?.accessToken

    if (!phoneNumberId || !accessToken) {
      return {
        ok: false,
        errorCode: 'unauthorized',
        errorMessage: 'Meta WhatsApp credentials are not configured.',
        retryable: false,
      }
    }

    const result = await sendWhatsAppTemplate({
      phoneNumberId,
      accessToken,
      toE164: input.recipientE164,
      templateName: input.templateName,
      languageCode: input.languageCode || 'en',
      bodyParams: input.bodyParams,
    })

    if (!result.ok) {
      const message = result.error ?? 'Meta send failed'
      const lower = message.toLowerCase()
      let errorCode = 'provider_error'
      if (lower.includes('phone') || lower.includes('recipient')) {
        errorCode = 'invalid_phone'
      } else if (lower.includes('template')) {
        errorCode = 'invalid_template'
      } else if (
        lower.includes('auth') ||
        lower.includes('token') ||
        lower.includes('oauth')
      ) {
        errorCode = 'unauthorized'
      }

      return {
        ok: false,
        errorCode,
        errorMessage: message,
        retryable: isRetryableProviderError(errorCode),
        raw: result.raw,
      }
    }

    return {
      ok: true,
      providerMessageId: result.messageId,
      raw: result.raw,
    }
  }

  normalizeWebhook(payload: unknown): WebhookNormalization[] {
    // Meta webhook shape is handled in whatsapp-webhook; this supports
    // a simplified internal shape for shared status updates.
    if (!payload || typeof payload !== 'object') return []
    const body = payload as {
      statuses?: Array<{
        id?: string
        status?: string
        errors?: Array<{ code?: number; title?: string; message?: string }>
      }>
    }

    const out: WebhookNormalization[] = []
    for (const status of body.statuses ?? []) {
      if (!status.id || !status.status) continue
      const mapped = mapMetaStatusToOutbox(status.status)
      if (!mapped) continue
      const err = status.errors?.[0]
      out.push({
        providerMessageId: status.id,
        status: mapped,
        errorCode: err?.code != null ? String(err.code) : undefined,
        errorMessage: err?.message ?? err?.title,
      })
    }
    return out
  }
}
