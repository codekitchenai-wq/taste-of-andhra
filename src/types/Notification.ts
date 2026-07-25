export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'whatsapp'

export interface AppNotification {
  id: string
  user_id: string
  title: string
  body: string
  channel: NotificationChannel
  notification_type: string
  order_id: string | null
  is_read: boolean
  metadata: Record<string, unknown>
  created_at: string
}
