import { Navigate } from 'react-router-dom'
import { AdminLoginForm } from '@/components/auth/AdminLoginForm'
import { LoadingState } from '@/components/ui/LoadingState'
import { APP_NAME } from '@/constants/APP'
import { ROUTES } from '@/constants/ROUTES'
import { Container } from '@/components/ui/Container'
import { useAuth } from '@/hooks/useAuth'

export default function AdminLoginPage() {
  const { isAuthenticated, role, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <LoadingState fullPage variant="inline" />
      </div>
    )
  }

  if (isAuthenticated && role === 'admin') {
    return <Navigate to={ROUTES.ADMIN.DASHBOARD} replace />
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Container className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-3xl font-bold text-primary">
              {APP_NAME}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">Admin Portal</p>
          </div>
          <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md md:p-8">
            <h2 className="text-xl font-semibold">Admin Login</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Restaurant staff sign in to manage operations.
            </p>
            <div className="mt-6">
              <AdminLoginForm />
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
