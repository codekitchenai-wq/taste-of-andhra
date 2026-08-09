import type { OrderStatus } from '@/types/enums'

export type WhatsAppProvider =
  | 'meta_cloud'
  | 'bsp_gupshup'
  | 'bsp_interakt'
  | 'bsp_other'

export type WhatsAppConnectionStatus =
  | 'disconnected'
  | 'pending_review'
  | 'connected'
  | 'error'

export type WhatsAppOutboxStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'skipped'

export type WhatsAppEnabledStatuses = Record<OrderStatus, boolean>

export interface WhatsAppTemplateRef {
  name: string
  language: string
}

export type WhatsAppTemplateMap = Partial<
  Record<OrderStatus, WhatsAppTemplateRef>
>

/** Safe config for admin UI — never includes access_token. */
export interface OrganizationWhatsAppConfig {
  id: string
  organization_id: string
  provider: WhatsAppProvider
  connection_status: WhatsAppConnectionStatus
  waba_id: string | null
  phone_number_id: string | null
  display_phone_number: string | null
  has_access_token: boolean
  webhook_verify_token: string | null
  enabled_statuses: WhatsAppEnabledStatuses
  template_map: WhatsAppTemplateMap
  last_error: string | null
  connected_at: string | null
  created_at: string
  updated_at: string
}

export interface WhatsAppMessageOutbox {
  id: string
  organization_id: string
  notification_id: string | null
  order_id: string | null
  user_id: string | null
  order_status: string
  recipient_phone: string | null
  template_name: string | null
  template_language: string
  template_params: unknown[]
  idempotency_key: string
  status: WhatsAppOutboxStatus
  provider_message_id: string | null
  attempt_count: number
  last_error: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface WhatsAppOutboxStats {
  queued: number
  sent: number
  delivered: number
  failed: number
  skipped: number
  total: number
}

export interface SaveWhatsAppConfigInput {
  provider?: WhatsAppProvider
  wabaId?: string | null
  phoneNumberId?: string | null
  displayPhoneNumber?: string | null
  enabledStatuses?: WhatsAppEnabledStatuses
  templateMap?: WhatsAppTemplateMap
  connectionStatus?: WhatsAppConnectionStatus
}

export interface ConnectWhatsAppCredentialsInput {
  provider: WhatsAppProvider
  wabaId: string
  phoneNumberId: string
  displayPhoneNumber: string
  accessToken: string
  webhookVerifyToken?: string
}
