import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { MasterLoginForm } from '@/components/auth/MasterLoginForm'
import { PlatformLogo } from '@/components/platform/PlatformLogo'
import { LoadingState } from '@/components/ui/LoadingState'
import { PLATFORM_BRAND_NAME } from '@/constants/PLATFORM'
import { ROUTES } from '@/constants/ROUTES'
import { Container } from '@/components/ui/Container'
import { useAuth } from '@/hooks/useAuth'
import { isPlatformMasterUser } from '@/utils/platformMaster'

export default function MasterLoginPage() {
  const { isAuthenticated, user, isLoading } = useAuth()

  useEffect(() => {
    document.title = `${PLATFORM_BRAND_NAME} Master`
  }, [])

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
            <div className="flex justify-center">
              <PlatformLogo variant="nav" />
            </div>
            <h1 className="mt-4 font-heading text-2xl font-bold text-primary">
              DirectApp Master
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Platform control plane
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-md md:p-8">
            <h2 className="text-xl font-semibold">Master login</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Control tenants, feature entitlements, and platform-wide access
              for DirectApp. For testing only — use the credentials shown
              below.
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
