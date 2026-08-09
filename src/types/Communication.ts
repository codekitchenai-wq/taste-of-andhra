export type CommunicationChannel = 'whatsapp' | 'sms' | 'email'

export type CommunicationProviderId =
  | 'mock'
  | 'meta_cloud'
  | 'gupshup'
  | 'msg91'
  | 'twilio'
  | 'bsp_other'
  | 'other'

export type CommunicationEventType =
  | 'ORDER_CREATED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'ORDER_OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'

export type CommunicationOutboxStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'skipped'

/** Provider-neutral message request (no provider-specific fields). */
export interface CommunicationSendRequest {
  organizationId: string
  customerId: string
  orderId?: string
  channel: Exclude<CommunicationChannel, 'email'>
  eventType: CommunicationEventType
  recipient: string
  templateKey: string
  variables: Record<string, string>
  priority?: 'normal' | 'high'
  metadata?: Record<string, unknown>
  idempotencyKey: string
}

export interface CommunicationSettings {
  id: string
  organization_id: string
  whatsapp_enabled: boolean
  sms_enabled: boolean
  email_enabled: boolean
  whatsapp_provider: CommunicationProviderId
  sms_provider: CommunicationProviderId
  fallback_policy: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CommunicationUsageSummary {
  billing_period: string
  whatsapp_units: number
  sms_units: number
  total_units: number
}

export interface CommunicationHistoryItem {
  id: string
  organization_id: string
  channel: string
  provider: string
  event_type: string | null
  order_status: string
  status: CommunicationOutboxStatus
  recipient_phone: string | null
  template_name: string | null
  last_error: string | null
  created_at: string
  sent_at: string | null
  delivered_at: string | null
}

export interface SaveCommunicationSettingsInput {
  whatsappEnabled?: boolean
  smsEnabled?: boolean
  emailEnabled?: boolean
  whatsappProvider?: CommunicationProviderId
  smsProvider?: CommunicationProviderId
}
