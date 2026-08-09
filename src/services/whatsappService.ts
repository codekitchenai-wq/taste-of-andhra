import {
  DEFAULT_WHATSAPP_ENABLED_STATUSES,
  DEFAULT_WHATSAPP_TEMPLATE_MAP,
  WHATSAPP_CONFIG_SAFE_COLUMNS,
  WHATSAPP_FEATURE_NOTIFICATIONS,
} from '@/constants/WHATSAPP'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { OrderStatus } from '@/types/enums'
import type {
  ConnectWhatsAppCredentialsInput,
  OrganizationWhatsAppConfig,
  SaveWhatsAppConfigInput,
  WhatsAppEnabledStatuses,
  WhatsAppMessageOutbox,
  WhatsAppOutboxStats,
  WhatsAppTemplateMap,
} from '@/types/WhatsApp'
import { supabase } from '@/services/supabaseClient'

function asEnabledStatuses(value: unknown): WhatsAppEnabledStatuses {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_WHATSAPP_ENABLED_STATUSES }
  }
  return {
    ...DEFAULT_WHATSAPP_ENABLED_STATUSES,
    ...(value as Partial<WhatsAppEnabledStatuses>),
  }
}

function asTemplateMap(value: unknown): WhatsAppTemplateMap {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_WHATSAPP_TEMPLATE_MAP }
  }
  return {
    ...DEFAULT_WHATSAPP_TEMPLATE_MAP,
    ...(value as WhatsAppTemplateMap),
  }
}

function mapConfig(row: Record<string, unknown>): OrganizationWhatsAppConfig {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    provider: row.provider as OrganizationWhatsAppConfig['provider'],
    connection_status:
      row.connection_status as OrganizationWhatsAppConfig['connection_status'],
    waba_id: (row.waba_id as string | null) ?? null,
    phone_number_id: (row.phone_number_id as string | null) ?? null,
    display_phone_number: (row.display_phone_number as string | null) ?? null,
    has_access_token: Boolean(row.token_configured),
    webhook_verify_token: (row.webhook_verify_token as string | null) ?? null,
    enabled_statuses: asEnabledStatuses(row.enabled_statuses),
    template_map: asTemplateMap(row.template_map),
    last_error: (row.last_error as string | null) ?? null,
    connected_at: (row.connected_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

function mapOutbox(row: Record<string, unknown>): WhatsAppMessageOutbox {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    notification_id: (row.notification_id as string | null) ?? null,
    order_id: (row.order_id as string | null) ?? null,
    user_id: (row.user_id as string | null) ?? null,
    order_status: row.order_status as string,
    recipient_phone: (row.recipient_phone as string | null) ?? null,
    template_name: (row.template_name as string | null) ?? null,
    template_language: (row.template_language as string) ?? 'en',
    template_params: Array.isArray(row.template_params)
      ? row.template_params
      : [],
    idempotency_key: row.idempotency_key as string,
    status: row.status as WhatsAppMessageOutbox['status'],
    provider_message_id: (row.provider_message_id as string | null) ?? null,
    attempt_count: Number(row.attempt_count ?? 0),
    last_error: (row.last_error as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function hasWhatsAppNotifications(
  organizationId: string = DEFAULT_ORGANIZATION_ID,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_feature', {
    target_org_id: organizationId,
    feature_key: WHATSAPP_FEATURE_NOTIFICATIONS,
  })

  if (error) {
    // Migration not applied yet — treat as disabled.
    return false
  }

  return Boolean(data)
}

export async function getWhatsAppConfig(
  organizationId: string = DEFAULT_ORGANIZATION_ID,
): Promise<ServiceResponse<OrganizationWhatsAppConfig | null>> {
  const { data, error } = await supabase
    .from('organization_whatsapp_configs')
    .select(WHATSAPP_CONFIG_SAFE_COLUMNS)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) {
    if (
      error.message.toLowerCase().includes('organization_whatsapp_configs') ||
      error.message.toLowerCase().includes('does not exist')
    ) {
      return createSuccessResponse(null)
    }
    return createErrorResponse(
      'Unable to load WhatsApp settings.',
      error.message,
    )
  }

  if (!data) return createSuccessResponse(null)
  return createSuccessResponse(mapConfig(data as Record<string, unknown>))
}

export async function saveWhatsAppConfig(
  input: SaveWhatsAppConfigInput,
  organizationId: string = DEFAULT_ORGANIZATION_ID,
): Promise<ServiceResponse<OrganizationWhatsAppConfig>> {
  const existing = await getWhatsAppConfig(organizationId)
  if (!existing.success) return existing

  const payload: Record<string, unknown> = {
    organization_id: organizationId,
    provider: input.provider ?? existing.data?.provider ?? 'meta_cloud',
    enabled_statuses:
      input.enabledStatuses ??
      existing.data?.enabled_statuses ??
      DEFAULT_WHATSAPP_ENABLED_STATUSES,
    template_map:
      input.templateMap ??
      existing.data?.template_map ??
      DEFAULT_WHATSAPP_TEMPLATE_MAP,
  }

  if (input.wabaId !== undefined) payload.waba_id = input.wabaId
  if (input.phoneNumberId !== undefined) {
    payload.phone_number_id = input.phoneNumberId
  }
  if (input.displayPhoneNumber !== undefined) {
    payload.display_phone_number = input.displayPhoneNumber
  }
  if (input.connectionStatus !== undefined) {
    payload.connection_status = input.connectionStatus
  }

  const { data, error } = await supabase
    .from('organization_whatsapp_configs')
    .upsert(payload, { onConflict: 'organization_id' })
    .select(WHATSAPP_CONFIG_SAFE_COLUMNS)
    .single()

  if (error || !data) {
    return createErrorResponse(
      'Unable to save WhatsApp settings.',
      error?.message,
    )
  }

  return createSuccessResponse(mapConfig(data as Record<string, unknown>))
}

/**
 * Stores Meta/BSP credentials via Edge Function so the access token is never
 * written from the browser against a SELECT-able path.
 */
export async function connectWhatsAppCredentials(
  input: ConnectWhatsAppCredentialsInput,
  organizationId: string = DEFAULT_ORGANIZATION_ID,
): Promise<ServiceResponse<OrganizationWhatsAppConfig>> {
  const { data, error } = await supabase.functions.invoke<{
    config?: Record<string, unknown>
    error?: string
  }>('whatsapp-connect', {
    body: {
      organizationId,
      provider: input.provider,
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      displayPhoneNumber: input.displayPhoneNumber,
      accessToken: input.accessToken,
      webhookVerifyToken: input.webhookVerifyToken,
    },
  })

  if (error) {
    return createErrorResponse(
      'Unable to connect WhatsApp.',
      error.message,
    )
  }

  if (data?.error) {
    return createErrorResponse(data.error)
  }

  if (!data?.config) {
    return createErrorResponse('WhatsApp connect returned no config.')
  }

  return createSuccessResponse(mapConfig(data.config))
}

export async function disconnectWhatsApp(
  organizationId: string = DEFAULT_ORGANIZATION_ID,
): Promise<ServiceResponse<OrganizationWhatsAppConfig | null>> {
  const { data, error } = await supabase.functions.invoke<{
    config?: Record<string, unknown> | null
    error?: string
  }>('whatsapp-connect', {
    body: { organizationId, action: 'disconnect' },
  })

  if (error) {
    return createErrorResponse(
      'Unable to disconnect WhatsApp.',
      error.message,
    )
  }

  if (data?.error) {
    return createErrorResponse(data.error)
  }

  if (!data?.config) return createSuccessResponse(null)
  return createSuccessResponse(mapConfig(data.config))
}

export async function sendWhatsAppTestMessage(
  recipientPhone: string,
  organizationId: string = DEFAULT_ORGANIZATION_ID,
): Promise<ServiceResponse<{ outboxId: string }>> {
  const { data, error } = await supabase.functions.invoke<{
    outboxId?: string
    error?: string
  }>('whatsapp-dispatch', {
    body: {
      mode: 'test',
      organizationId,
      recipientPhone,
    },
  })

  if (error) {
    return createErrorResponse('Unable to send test message.', error.message)
  }

  if (data?.error) {
    return createErrorResponse(data.error)
  }

  if (!data?.outboxId) {
    return createErrorResponse('Test dispatch returned no outbox id.')
  }

  return createSuccessResponse({ outboxId: data.outboxId })
}

export async function triggerWhatsAppDispatch(
  outboxId?: string,
): Promise<void> {
  // Prefer provider-agnostic dispatcher; fall back for older deployments.
  const body = outboxId ? { outboxId } : { mode: 'drain' as const }
  const primary = await supabase.functions.invoke('communication-dispatch', {
    body,
  })
  if (!primary.error) return

  await supabase.functions.invoke('whatsapp-dispatch', { body })
}

export async function getOutboxStats(
  organizationId: string = DEFAULT_ORGANIZATION_ID,
): Promise<ServiceResponse<WhatsAppOutboxStats>> {
  const { data, error } = await supabase
    .from('whatsapp_message_outbox')
    .select('status')
    .eq('organization_id', organizationId)

  if (error) {
    if (error.message.toLowerCase().includes('whatsapp_message_outbox')) {
      return createSuccessResponse({
        queued: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        skipped: 0,
        total: 0,
      })
    }
    return createErrorResponse('Unable to load WhatsApp stats.', error.message)
  }

  const stats: WhatsAppOutboxStats = {
    queued: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    skipped: 0,
    total: data?.length ?? 0,
  }

  for (const row of data ?? []) {
    const status = row.status as string
    if (status === 'queued' || status === 'sending') stats.queued += 1
    else if (status === 'sent') stats.sent += 1
    else if (status === 'delivered' || status === 'read') stats.delivered += 1
    else if (status === 'failed') stats.failed += 1
    else if (status === 'skipped') stats.skipped += 1
  }

  return createSuccessResponse(stats)
}

export async function getRecentOutbox(
  organizationId: string = DEFAULT_ORGANIZATION_ID,
  limit = 20,
): Promise<ServiceResponse<WhatsAppMessageOutbox[]>> {
  const { data, error } = await supabase
    .from('whatsapp_message_outbox')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (error.message.toLowerCase().includes('whatsapp_message_outbox')) {
      return createSuccessResponse([])
    }
    return createErrorResponse(
      'Unable to load WhatsApp message log.',
      error.message,
    )
  }

  return createSuccessResponse(
    (data ?? []).map((row) => mapOutbox(row as Record<string, unknown>)),
  )
}

export function isStatusEnabledForWhatsApp(
  enabled: WhatsAppEnabledStatuses,
  status: string,
): boolean {
  return Boolean(enabled[status as OrderStatus])
}
