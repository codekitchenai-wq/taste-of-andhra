import type { createClient } from 'jsr:@supabase/supabase-js@2'
import { getChannelProvider } from './factory.ts'
import { billingPeriodUtc, type SendMessageResult } from './types.ts'

type AdminClient = ReturnType<typeof createClient>

export type ProcessOutboxResult = {
  ok: boolean
  messageId?: string
  error?: string
  retryable?: boolean
}

function nextBackoffIso(attemptCount: number): string {
  const minutes = Math.min(60, Math.pow(2, Math.max(0, attemptCount - 1)))
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

async function resolveWhatsAppCredentials(
  admin: AdminClient,
  organizationId: string,
  provider: string,
): Promise<Record<string, string> | undefined> {
  if (provider === 'mock') return {}

  if (provider === 'meta_cloud') {
    const { data: config } = await admin
      .from('organization_whatsapp_configs')
      .select('access_token, phone_number_id')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (!config?.access_token || !config.phone_number_id) return undefined

    return {
      accessToken: config.access_token as string,
      phoneNumberId: config.phone_number_id as string,
    }
  }

  // Gupshup / others: public_config + Edge env via secret_ref (Phase D)
  const { data: account } = await admin
    .from('communication_provider_accounts')
    .select('public_config, secret_ref, status')
    .eq('organization_id', organizationId)
    .eq('channel', 'whatsapp')
    .eq('provider', provider)
    .maybeSingle()

  if (!account || account.status !== 'connected') return undefined

  const publicConfig = (account.public_config ?? {}) as Record<string, string>
  const creds: Record<string, string> = { ...publicConfig }
  if (account.secret_ref && typeof account.secret_ref === 'string') {
    const envName = account.secret_ref.startsWith('env:')
      ? account.secret_ref.slice(4)
      : account.secret_ref
    const secret = Deno.env.get(envName)
    if (secret) creds.apiKey = secret
  }
  return creds
}

async function recordUsage(
  admin: AdminClient,
  row: Record<string, unknown>,
): Promise<void> {
  const organizationId = row.organization_id as string
  const channel = (row.channel as string) || 'whatsapp'
  const provider = (row.provider as string) || 'meta_cloud'
  const outboxId = row.id as string

  try {
    await admin.from('communication_usage').insert({
      organization_id: organizationId,
      channel,
      provider,
      outbox_id: outboxId,
      units: 1,
      billing_period: billingPeriodUtc(),
    })
  } catch {
    // Usage table may not exist yet in older environments — ignore.
  }
}

async function markFailed(
  admin: AdminClient,
  outboxId: string,
  notificationId: string | null,
  message: string,
  errorCode?: string,
  retryable?: boolean,
  attemptCount?: number,
) {
  const patch: Record<string, unknown> = {
    status: 'failed',
    last_error: message,
    error_code: errorCode ?? null,
    failed_at: new Date().toISOString(),
  }

  if (retryable && attemptCount != null && attemptCount < 3) {
    patch.status = 'queued'
    patch.next_attempt_at = nextBackoffIso(attemptCount)
    patch.failed_at = null
  }

  await admin.from('whatsapp_message_outbox').update(patch).eq('id', outboxId)

  if (notificationId) {
    await admin
      .from('notifications')
      .update({
        metadata: {
          external_status: patch.status === 'queued' ? 'queued' : 'failed',
          note: message,
          error_code: errorCode,
        },
      })
      .eq('id', notificationId)
  }
}

/**
 * Provider-agnostic outbox processor used by communication-dispatch
 * and whatsapp-dispatch.
 */
export async function processOutboxRow(
  admin: AdminClient,
  outboxId: string,
): Promise<ProcessOutboxResult> {
  const { data: row, error } = await admin
    .from('whatsapp_message_outbox')
    .select('*')
    .eq('id', outboxId)
    .maybeSingle()

  if (error || !row) {
    return { ok: false, error: 'Outbox row not found.' }
  }

  if (row.status !== 'queued' && row.status !== 'failed') {
    return { ok: true, messageId: row.provider_message_id ?? undefined }
  }

  if (
    row.next_attempt_at &&
    new Date(row.next_attempt_at as string).getTime() > Date.now() &&
    row.status === 'queued'
  ) {
    return { ok: true }
  }

  const attemptCount = (row.attempt_count as number) + 1

  await admin
    .from('whatsapp_message_outbox')
    .update({
      status: 'sending',
      attempt_count: attemptCount,
    })
    .eq('id', outboxId)

  const channel = ((row.channel as string) || 'whatsapp') as 'whatsapp' | 'sms'
  const provider =
    (row.provider as string) ||
    (channel === 'sms'
      ? Deno.env.get('SMS_PROVIDER') ?? 'mock'
      : Deno.env.get('WHATSAPP_PROVIDER') ?? 'meta_cloud')

  let credentials: Record<string, string> | undefined
  try {
    if (channel === 'whatsapp') {
      credentials = await resolveWhatsAppCredentials(
        admin,
        row.organization_id as string,
        provider,
      )
      if (provider !== 'mock' && !credentials) {
        await markFailed(
          admin,
          outboxId,
          row.notification_id as string | null,
          'Provider credentials are not configured.',
          'unauthorized',
          false,
          attemptCount,
        )
        return { ok: false, error: 'Provider credentials are not configured.' }
      }
    } else {
      credentials = {}
    }

    const adapter = getChannelProvider(channel, provider)
    const params = Array.isArray(row.template_params)
      ? (row.template_params as string[]).map(String)
      : []

    const sendResult: SendMessageResult = await adapter.sendTemplate({
      organizationId: row.organization_id as string,
      channel,
      recipientE164: (row.recipient_phone as string) || '',
      templateName: (row.template_name as string) || 'order_confirmed',
      languageCode: (row.template_language as string) || 'en',
      bodyParams: params,
      eventType: (row.event_type as string | null) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      credentials,
    })

    if (!sendResult.ok) {
      const retryable = Boolean(sendResult.retryable)
      await markFailed(
        admin,
        outboxId,
        row.notification_id as string | null,
        sendResult.errorMessage ?? 'Send failed',
        sendResult.errorCode,
        retryable,
        attemptCount,
      )
      return {
        ok: false,
        error: sendResult.errorMessage,
        retryable,
      }
    }

    const now = new Date().toISOString()
    await admin
      .from('whatsapp_message_outbox')
      .update({
        status: 'sent',
        provider_message_id: sendResult.providerMessageId ?? null,
        last_error: null,
        error_code: null,
        sent_at: now,
        next_attempt_at: null,
      })
      .eq('id', outboxId)

    if (row.notification_id) {
      await admin
        .from('notifications')
        .update({
          metadata: {
            external_status: 'sent',
            provider_message_id: sendResult.providerMessageId,
            provider,
            channel,
            note: `${channel} template sent via ${provider}`,
          },
        })
        .eq('id', row.notification_id)
    }

    await recordUsage(admin, { ...row, provider, channel })

    return { ok: true, messageId: sendResult.providerMessageId }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Dispatch error'
    await markFailed(
      admin,
      outboxId,
      row.notification_id as string | null,
      message,
      'dispatch_error',
      true,
      attemptCount,
    )
    return { ok: false, error: message, retryable: true }
  }
}
