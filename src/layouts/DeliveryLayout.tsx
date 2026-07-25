import { Link, Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { APP_NAME } from '@/constants/APP'
import { ROUTES } from '@/constants/ROUTES'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { useAuth } from '@/hooks/useAuth'

export function DeliveryLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    const result = await logout()
    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success('Signed out')
    navigate(ROUTES.DELIVERY.LOGIN)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-black/5 bg-surface">
        <Container className="flex h-16 items-center justify-between gap-4">
          <div>
            <Link
              to={ROUTES.DELIVERY.DASHBOARD}
              className="font-heading text-lg font-bold text-primary"
            >
              {APP_NAME} · Delivery
            </Link>
            {user && (
              <p className="text-xs text-text-secondary">{user.full_name}</p>
            )}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => void handleLogout()}>
            Sign out
          </Button>
        </Container>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
