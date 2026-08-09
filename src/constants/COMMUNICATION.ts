import type {
  CommunicationEventType,
  CommunicationProviderId,
} from '@/types/Communication'

export const COMMUNICATION_FEATURE_SMS = 'sms_notifications' as const

export const DEFAULT_WHATSAPP_PROVIDER: CommunicationProviderId = 'meta_cloud'
export const DEFAULT_SMS_PROVIDER: CommunicationProviderId = 'mock'

export const COMMUNICATION_SETTINGS_COLUMNS =
  'id, organization_id, whatsapp_enabled, sms_enabled, email_enabled, whatsapp_provider, sms_provider, fallback_policy, created_at, updated_at' as const

/** Order status → internal communication event. */
export const ORDER_STATUS_EVENT_MAP: Record<string, CommunicationEventType> = {
  pending: 'ORDER_CREATED',
  confirmed: 'ORDER_CONFIRMED',
  preparing: 'ORDER_PREPARING',
  ready: 'ORDER_READY',
  out_for_delivery: 'ORDER_OUT_FOR_DELIVERY',
  delivered: 'ORDER_DELIVERED',
  cancelled: 'ORDER_CANCELLED',
}
