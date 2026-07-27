import { Navigate } from 'react-router-dom'
import { MasterLoginForm } from '@/components/auth/MasterLoginForm'
import { LoadingState } from '@/components/ui/LoadingState'
import { APP_NAME } from '@/constants/APP'
import { ROUTES } from '@/constants/ROUTES'
import { Container } from '@/components/ui/Container'
import { useAuth } from '@/hooks/useAuth'
import { isPlatformMasterUser } from '@/utils/platformMaster'

export default function MasterLoginPage() {
  const { isAuthenticated, user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <LoadingState fullPage variant="inline" />
      </div>
    )
  }

  if (isAuthenticated && isPlatformMasterUser(user)) {
    return <Navigate to={ROUTES.MASTER.DASHBOARD} replace />
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Container className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-3xl font-bold text-primary">
              {APP_NAME}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Platform Master / Superuser
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md md:p-8">
            <h2 className="text-xl font-semibold">Superuser Login</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Control tenants, feature entitlements, and platform-wide access.
              For testing only — use the credentials shown below.
            </p>
            <div className="mt-6">
              <MasterLoginForm />
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
