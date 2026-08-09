/**
 * Creates in-app notifications and dispatches external channels.
 * WhatsApp/SMS go through the communication module (outbox + provider adapters).
 * Providers are never called directly from order logic.
 */
import { APP_NAME } from '@/constants/APP'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type {
  AppNotification,
  NotificationChannel,
} from '@/types/Notification'
import * as communicationService from '@/services/communicationService'
import { requireUserId } from '@/services/requireUserId'
import { supabase } from '@/services/supabaseClient'
import { orderStatusToCommunicationEvent } from '@/utils/communicationEvents'
import { normalizeIndianPhone, toE164IndianPhone } from '@/utils/phone'

function mapNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    organization_id: (row.organization_id as string | null) ?? null,
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
  organizationId?: string
  channels?: NotificationChannel[]
  metadata?: Record<string, unknown>
}

async function resolveRecipientPhone(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', userId)
    .maybeSingle()

  const raw = (data?.phone as string | null | undefined)?.trim()
  if (!raw) return null

  const normalized = normalizeIndianPhone(raw)
  if (!normalized) return null

  try {
    return toE164IndianPhone(normalized)
  } catch {
    return null
  }
}

async function enqueueChannelIfAllowed(args: {
  organizationId: string
  notificationId: string
  orderId: string
  userId: string
  orderStatus: string
  channel: 'whatsapp' | 'sms'
  orderNumber: string
  restaurantName: string
  etaLabel: string | null
  optedIn: boolean
}): Promise<'queued' | 'skipped' | 'stub'> {
  const phone = await resolveRecipientPhone(args.userId)

  const params: string[] = [args.restaurantName, args.orderNumber]
  if (args.orderStatus === 'confirmed' && args.etaLabel) {
    params.push(args.etaLabel)
  }

  return communicationService.enqueueChannelCommunication({
    organizationId: args.organizationId,
    notificationId: args.notificationId,
    orderId: args.orderId,
    userId: args.userId,
    orderStatus: args.orderStatus,
    channel: args.channel,
    recipientPhone: phone,
    templateParams: params,
    optedIn: args.optedIn,
  })
}

export async function notifyUser(
  input: CreateNotificationInput,
): Promise<ServiceResponse<AppNotification[]>> {
  const channels = input.channels ?? ['in_app', 'sms']
  const organizationId = input.organizationId ?? DEFAULT_ORGANIZATION_ID
  const created: AppNotification[] = []

  for (const channel of channels) {
    const metadata: Record<string, unknown> = {
      ...(input.metadata ?? {}),
      external_status:
        channel === 'in_app' ? 'delivered' : 'queued_stub',
      note:
        channel === 'in_app'
          ? undefined
          : `${channel} delivery requires provider configuration`,
    }

    const insertPayload: Record<string, unknown> = {
      user_id: input.userId,
      title: input.title,
      body: input.body,
      channel,
      notification_type: input.notificationType ?? 'general',
      order_id: input.orderId ?? null,
      organization_id: organizationId,
      metadata,
    }

    let { data, error } = await supabase
      .from('notifications')
      .insert(insertPayload)
      .select()
      .single()

    if (
      error &&
      error.message.toLowerCase().includes('organization_id')
    ) {
      const { organization_id: _org, ...legacy } = insertPayload
      const retry = await supabase
        .from('notifications')
        .insert(legacy)
        .select()
        .single()
      data = retry.data
      error = retry.error
    }

    if (error || !data) {
      return createErrorResponse(
        'Unable to create notification.',
        error?.message,
      )
    }

    created.push(mapNotification(data as Record<string, unknown>))
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

  const { data: order } = await supabase
    .from('orders')
    .select('organization_id, whatsapp_updates_opt_in, estimated_delivery')
    .eq('id', orderId)
    .maybeSingle()

  const organizationId =
    (order?.organization_id as string | undefined) ?? DEFAULT_ORGANIZATION_ID
  const optedIn = Boolean(order?.whatsapp_updates_opt_in)

  let restaurantName = APP_NAME
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .maybeSingle()
  if (org?.name) restaurantName = org.name as string

  let etaLabel: string | null = null
  const eta = order?.estimated_delivery as string | null | undefined
  if (eta) {
    try {
      etaLabel = new Date(eta).toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      etaLabel = null
    }
  }

  const eventType = orderStatusToCommunicationEvent(status)

  const result = await notifyUser({
    userId,
    title: message.title,
    body: message.body(orderNumber),
    notificationType: `order_${status}`,
    orderId,
    organizationId,
    channels: ['in_app', 'sms', 'whatsapp'],
    metadata: { event_type: eventType },
  })

  if (!result.success) return

  const channelNotes: Record<
    string,
    { queued: string; skipped: string; stub: string }
  > = {
    whatsapp: {
      queued: 'Queued for WhatsApp template delivery',
      skipped:
        'Skipped (prefs, consent, opt-out, or missing phone/template)',
      stub: 'whatsapp delivery requires provider configuration',
    },
    sms: {
      queued: 'Queued for SMS delivery',
      skipped: 'Skipped (prefs, consent, or missing phone/template)',
      stub: 'sms delivery requires provider configuration',
    },
  }

  for (const channel of ['whatsapp', 'sms'] as const) {
    const notification = result.data.find((n) => n.channel === channel)
    if (!notification) continue

    const dispatchResult = await enqueueChannelIfAllowed({
      organizationId,
      notificationId: notification.id,
      orderId,
      userId,
      orderStatus: status,
      channel,
      orderNumber,
      restaurantName,
      etaLabel,
      optedIn,
    })

    const copy = channelNotes[channel]
    const externalStatus =
      dispatchResult === 'queued'
        ? 'queued'
        : dispatchResult === 'skipped'
          ? 'skipped'
          : 'queued_stub'
    const note =
      dispatchResult === 'queued'
        ? copy.queued
        : dispatchResult === 'skipped'
          ? copy.skipped
          : copy.stub

    await supabase
      .from('notifications')
      .update({
        metadata: {
          ...notification.metadata,
          event_type: eventType,
          external_status: externalStatus,
          note,
        },
      })
      .eq('id', notification.id)
  }
}
