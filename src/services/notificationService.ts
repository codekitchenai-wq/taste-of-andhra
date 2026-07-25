import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type {
  AppNotification,
  NotificationChannel,
} from '@/types/Notification'
import { requireUserId } from '@/services/requireUserId'
import { supabase } from '@/services/supabaseClient'

function mapNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    body: row.body as string,
    channel: row.channel as NotificationChannel,
    notification_type: row.notification_type as string,
    order_id: (row.order_id as string | null) ?? null,
    is_read: Boolean(row.is_read),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
  }
}

export interface CreateNotificationInput {
  userId: string
  title: string
  body: string
  notificationType?: string
  orderId?: string
  channels?: NotificationChannel[]
  metadata?: Record<string, unknown>
}

/**
 * Creates in-app notifications and stubs external channels (email/SMS/WhatsApp).
 * External delivery requires provider credentials; we record intended sends in metadata.
 */
export async function notifyUser(
  input: CreateNotificationInput,
): Promise<ServiceResponse<AppNotification[]>> {
  const channels = input.channels ?? ['in_app', 'sms']
  const created: AppNotification[] = []

  for (const channel of channels) {
    const metadata = {
      ...(input.metadata ?? {}),
      external_status:
        channel === 'in_app' ? 'delivered' : 'queued_stub',
      note:
        channel === 'in_app'
          ? undefined
          : `${channel} delivery requires provider configuration`,
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.userId,
        title: input.title,
        body: input.body,
        channel,
        notification_type: input.notificationType ?? 'general',
        order_id: input.orderId ?? null,
        metadata,
      })
      .select()
      .single()

    if (error) {
      return createErrorResponse(
        'Unable to create notification.',
        error.message,
      )
    }

    created.push(mapNotification(data))
  }

  return createSuccessResponse(created)
}

export async function getMyNotifications(
  limit = 40,
): Promise<ServiceResponse<AppNotification[]>> {
  const userResult = await requireUserId()
  if (!userResult.success) return userResult

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userResult.data)
    .eq('channel', 'in_app')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return createErrorResponse('Unable to load notifications.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapNotification))
}

export async function getUnreadCount(): Promise<ServiceResponse<number>> {
  const userResult = await requireUserId()
  if (!userResult.success) return userResult

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userResult.data)
    .eq('channel', 'in_app')
    .eq('is_read', false)

  if (error) {
    return createErrorResponse('Unable to load unread count.', error.message)
  }

  return createSuccessResponse(count ?? 0)
}

export async function markAsRead(
  notificationId: string,
): Promise<ServiceResponse<AppNotification>> {
  const userResult = await requireUserId()
  if (!userResult.success) return userResult

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userResult.data)
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to mark notification read.', error.message)
  }

  return createSuccessResponse(mapNotification(data))
}

export async function markAllAsRead(): Promise<ServiceResponse<null>> {
  const userResult = await requireUserId()
  if (!userResult.success) return userResult

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userResult.data)
    .eq('is_read', false)

  if (error) {
    return createErrorResponse('Unable to mark all as read.', error.message)
  }

  return createSuccessResponse(null)
}

const ORDER_STATUS_MESSAGES: Record<
  string,
  { title: string; body: (orderNumber: string) => string }
> = {
  pending: {
    title: 'Order placed',
    body: (n) => `Your order ${n} has been placed successfully.`,
  },
  confirmed: {
    title: 'Order confirmed',
    body: (n) => `Your order ${n} has been confirmed by the restaurant.`,
  },
  preparing: {
    title: 'Preparing your food',
    body: (n) => `The kitchen has started preparing order ${n}.`,
  },
  ready: {
    title: 'Order ready',
    body: (n) => `Order ${n} is ready for pickup / delivery.`,
  },
  out_for_delivery: {
    title: 'Out for delivery',
    body: (n) => `Order ${n} is on the way. Track live GPS on the order page.`,
  },
  delivered: {
    title: 'Delivered',
    body: (n) => `Order ${n} has been delivered. Enjoy your meal!`,
  },
  cancelled: {
    title: 'Order cancelled',
    body: (n) => `Order ${n} has been cancelled.`,
  },
}

export async function notifyOrderStatus(
  userId: string,
  orderId: string,
  orderNumber: string,
  status: string,
): Promise<void> {
  const message = ORDER_STATUS_MESSAGES[status]
  if (!message) return

  await notifyUser({
    userId,
    title: message.title,
    body: message.body(orderNumber),
    notificationType: `order_${status}`,
    orderId,
    channels: ['in_app', 'sms', 'whatsapp'],
  })
}
