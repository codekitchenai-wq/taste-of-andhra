import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ROUTES } from '@/constants/ROUTES'
import * as notificationService from '@/services/notificationService'
import type { AppNotification } from '@/types/Notification'
import { formatDateTime } from '@/utils/format'
import { cn } from '@/utils/cn'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await notificationService.getMyNotifications()

    if (result.success) {
      setNotifications(result.data)
    } else {
      setError(result.message)
      setNotifications([])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true)

    const result = await notificationService.markAllAsRead()

    setIsMarkingAll(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('All notifications marked as read')
    void refetch()
  }

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.is_read) {
      const result = await notificationService.markAsRead(notification.id)

      if (result.success) {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item,
          ),
        )
      }
    }

    if (notification.order_id) {
      navigate(ROUTES.ORDER_DETAILS(notification.order_id))
    }
  }

  return (
    <Container as="div" className="py-8 md:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <PageHeader
            title="Notifications"
            description="Order updates and alerts from The Taste of Andhra."
          />
        </div>
        {unreadCount > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isMarkingAll}
            onClick={() => void handleMarkAllRead()}
            className="shrink-0 sm:mt-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading && <LoadingState variant="inline" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && notifications.length === 0 && (
        <EmptyState
          title="No notifications"
          description="You'll see order updates and alerts here."
          icon={Bell}
        />
      )}

      {!isLoading && !error && notifications.length > 0 && (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-md">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => void handleNotificationClick(notification)}
                className={cn(
                  'flex w-full flex-col gap-1 px-5 py-4 text-left transition-colors hover:bg-background/60',
                  !notification.is_read && 'bg-primary/5',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={cn(
                      'font-medium text-text-primary',
                      !notification.is_read && 'font-semibold',
                    )}
                  >
                    {notification.title}
                  </p>
                  {!notification.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                <p className="text-sm text-text-secondary">{notification.body}</p>
                <p className="text-xs text-text-secondary">
                  {formatDateTime(notification.created_at)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}
