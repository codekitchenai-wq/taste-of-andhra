import type { OrderStatus } from '@/types/enums'
import type {
  WhatsAppEnabledStatuses,
  WhatsAppTemplateMap,
} from '@/types/WhatsApp'

/** Statuses restaurants can toggle for WhatsApp utility templates. */
export const WHATSAPP_TOGGLEABLE_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
]

export const DEFAULT_WHATSAPP_ENABLED_STATUSES: WhatsAppEnabledStatuses = {
  pending: false,
  confirmed: true,
  preparing: true,
  ready: true,
  out_for_delivery: true,
  delivered: true,
  cancelled: true,
}

export const DEFAULT_WHATSAPP_TEMPLATE_MAP: WhatsAppTemplateMap = {
  confirmed: { name: 'order_confirmed', language: 'en' },
  preparing: { name: 'order_preparing', language: 'en' },
  ready: { name: 'order_ready', language: 'en' },
  out_for_delivery: { name: 'order_out_for_delivery', language: 'en' },
  delivered: { name: 'order_delivered', language: 'en' },
  cancelled: { name: 'order_cancelled', language: 'en' },
}

export const WHATSAPP_FEATURE_NOTIFICATIONS = 'whatsapp_notifications' as const
export const WHATSAPP_FEATURE_ORDERING = 'whatsapp_ordering' as const

/** Columns selected for admin/master UI (excludes access_token). */
export const WHATSAPP_CONFIG_SAFE_COLUMNS =
  'id, organization_id, provider, connection_status, waba_id, phone_number_id, display_phone_number, token_configured, webhook_verify_token, enabled_statuses, template_map, last_error, connected_at, created_at, updated_at' as const
