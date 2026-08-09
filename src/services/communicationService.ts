/**
 * Provider-agnostic communication settings, history, usage, and dispatch.
 * Order/business code must not call provider APIs — only this layer + RPCs.
 */
import {
  COMMUNICATION_SETTINGS_COLUMNS,
  DEFAULT_SMS_PROVIDER,
  DEFAULT_WHATSAPP_PROVIDER,
} from '@/constants/COMMUNICATION'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type {
  CommunicationHistoryItem,
  CommunicationSettings,
  CommunicationUsageSummary,
  SaveCommunicationSettingsInput,
} from '@/types/Communication'
import { supabase } from '@/services/supabaseClient'

function mapSettings(row: Record<string, unknown>): CommunicationSettings {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    whatsapp_enabled: Boolean(row.whatsapp_enabled),
    sms_enabled: Boolean(row.sms_enabled),
    email_enabled: Boolean(row.email_enabled),
    whatsapp_provider:
      (row.whatsapp_provider as CommunicationSettings['whatsapp_provider']) ??
      DEFAULT_WHATSAPP_PROVIDER,
    sms_provider:
      (row.sms_provider as CommunicationSettings['sms_provider']) ??
      DEFAULT_SMS_PROVIDER,
    fallback_policy: (row.fallback_policy as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

function mapHistory(row: Record<string, unknown>): CommunicationHistoryItem {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    channel: (row.channel as string) ?? 'whatsapp',
    provider: (row.provider as string) ?? DEFAULT_WHATSAPP_PROVIDER,
    event_type: (row.event_type as string | null) ?? null,
    order_status: row.order_status as string,
    status: row.status as CommunicationHistoryItem['status'],
    recipient_phone: (row.recipient_phone as string | null) ?? null,
    template_name: (row.template_name as string | null) ?? null,
    last_error: (row.last_error as string | null) ?? null,
    created_at: row.created_at as string,
    sent_at: (row.sent_at as string | null) ?? null,
    delivered_at: (row.delivered_at as string | null) ?? null,
  }
}

function missingRelation(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase()
  return (
    lower.includes('does not exist') ||
    lower.includes('communication_settings') ||
    lower.includes('communication_usage') ||
    lower.includes('whatsapp_message_outbox')
  )
}

export async function getCommunicationSettings(
  organizationId: string = DEFAULT_ORGANIZATION_ID,
): Promise<ServiceResponse<CommunicationSettings | null>> {
  const { data, error } = await supabase
    .from('communication_settings')
    .select(COMMUNICATION_SETTINGS_COLUMNS)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) {
    if (missingRelation(error.message)) {
      return createSuccessResponse(null)
    }
    return createErrorResponse(
      'Unable to load communication settings.',
      error.message,
    )
  }

  return createSuccessResponse(
    data ? mapSettings(data as Record<string, unknown>) : null,
  )
}

export async function saveCommunicationSettings(
  organizationId: string,
  input: SaveCommunicationSettingsInput,
): Promise<ServiceResponse<CommunicationSettings>> {
  const payload: Record<string, unknown> = {
    organization_id: organizationId,
  }

  if (input.whatsappEnabled !== undefined) {
    payload.whatsapp_enabled = input.whatsappEnabled
  }
  if (input.smsEnabled !== undefined) {
    payload.sms_enabled = input.smsEnabled
  }
  if (input.emailEnabled !== undefined) {
    payload.email_enabled = input.emailEnabled
  }
  if (input.whatsappProvider !== undefined) {
    payload.whatsapp_provider = input.whatsappProvider
  }
  if (input.smsProvider !== undefined) {
    payload.sms_provider = input.smsProvider
  }

  const { data, error } = await supabase
    .from('communication_settings')
    .upsert(payload, { onConflict: 'organization_id' })
    .select(COMMUNICATION_SETTINGS_COLUMNS)
    .single()

  if (error || !data) {
    return createErrorResponse(
      'Unable to save communication settings.',
      error?.message,
    )
  }

  return createSuccessResponse(mapSettings(data as Record<string, unknown>))
}

export async function getCommunicationHistory(
  organizationId: string = DEFAULT_ORGANIZATION_ID,
  limit = 40,
): Promise<ServiceResponse<CommunicationHistoryItem[]>> {
  const { data, error } = await supabase
    .from('whatsapp_message_outbox')
    .select(
      'id, organization_id, channel, provider, event_type, order_status, status, recipient_phone, template_name, last_error, created_at, sent_at, delivered_at',
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (missingRelation(error.message)) {
      return createSuccessResponse([])
    }
    return createErrorResponse(
      'Unable to load communication history.',
      error.message,
    )
  }

  return createSuccessResponse(
    (data ?? []).map((row) => mapHistory(row as Record<string, unknown>)),
  )
}

export async function getCommunicationUsage(
  organizationId: string = DEFAULT_ORGANIZATION_ID,
  billingPeriod?: string,
): Promise<ServiceResponse<CommunicationUsageSummary>> {
  const period =
    billingPeriod ??
    (() => {
      const now = new Date()
      return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    })()

  const { data, error } = await supabase
    .from('communication_usage')
    .select('channel, units')
    .eq('organization_id', organizationId)
    .eq('billing_period', period)

  if (error) {
    if (missingRelation(error.message)) {
      return createSuccessResponse({
        billing_period: period,
        whatsapp_units: 0,
        sms_units: 0,
        total_units: 0,
      })
    }
    return createErrorResponse(
      'Unable to load communication usage.',
      error.message,
    )
  }

  let whatsapp = 0
  let sms = 0
  for (const row of data ?? []) {
    const units = Number(row.units ?? 0)
    if (row.channel === 'sms') sms += units
    else if (row.channel === 'whatsapp') whatsapp += units
  }

  return createSuccessResponse({
    billing_period: period,
    whatsapp_units: whatsapp,
    sms_units: sms,
    total_units: whatsapp + sms,
  })
}

/** Fire-and-forget dispatch via communication-dispatch (falls back to whatsapp-dispatch). */
export async function triggerCommunicationDispatch(
  outboxId?: string,
): Promise<void> {
  const body = outboxId ? { outboxId } : { mode: 'drain' as const }

  const primary = await supabase.functions.invoke('communication-dispatch', {
    body,
  })

  if (!primary.error) return

  await supabase.functions.invoke('whatsapp-dispatch', { body })
}

export type EnqueueCommunicationResult = 'queued' | 'skipped' | 'stub'

export async function enqueueChannelCommunication(args: {
  organizationId: string
  notificationId: string
  orderId: string
  userId: string
  orderStatus: string
  channel: 'whatsapp' | 'sms'
  recipientPhone: string | null
  templateParams: string[]
  optedIn: boolean
}): Promise<EnqueueCommunicationResult> {
  const { data, error } = await supabase.rpc(
    'prepare_and_enqueue_communication',
    {
      p_organization_id: args.organizationId,
      p_notification_id: args.notificationId,
      p_order_id: args.orderId,
      p_user_id: args.userId,
      p_order_status: args.orderStatus,
      p_channel: args.channel,
      p_recipient_phone: args.recipientPhone,
      p_template_params: args.templateParams,
      p_opted_in: args.optedIn,
    },
  )

  if (error) {
    // Migration not applied — fall back to legacy WhatsApp-only RPC.
    if (args.channel !== 'whatsapp') return 'stub'

    const legacy = await supabase.rpc(
      'prepare_and_enqueue_whatsapp_order_status',
      {
        p_organization_id: args.organizationId,
        p_notification_id: args.notificationId,
        p_order_id: args.orderId,
        p_user_id: args.userId,
        p_order_status: args.orderStatus,
        p_recipient_phone: args.recipientPhone,
        p_template_params: args.templateParams,
        p_opted_in: args.optedIn,
      },
    )

    if (legacy.error) return 'stub'
    const legacyPayload = legacy.data as {
      result?: string
      outbox_id?: string
    } | null

    if (legacyPayload?.result === 'queued' && legacyPayload.outbox_id) {
      void triggerCommunicationDispatch(legacyPayload.outbox_id)
      return 'queued'
    }
    if (legacyPayload?.result === 'skipped') return 'skipped'
    return 'stub'
  }

  const payload = data as {
    result?: string
    outbox_id?: string
  } | null

  if (payload?.result === 'queued' && payload.outbox_id) {
    void triggerCommunicationDispatch(payload.outbox_id)
    return 'queued'
  }

  if (payload?.result === 'skipped') return 'skipped'
  return 'stub'
}
