import { EmailAuthForm } from '@/components/auth/EmailAuthForm'
import { CustomerSocialAuth } from '@/components/auth/CustomerSocialAuth'
import { useOrganization } from '@/contexts/OrganizationContext'
import { ROUTES } from '@/constants/ROUTES'
import { useLocation } from 'react-router-dom'

export function LoginForm() {
  const { whatsappOtpLoginEnabled } = useOrganization()
  const location = useLocation()
  const nextFromQuery = new URLSearchParams(location.search).get('next')
  const safeNext =
    nextFromQuery?.startsWith('/') && !nextFromQuery.startsWith('//')
      ? nextFromQuery
      : (location.state as { from?: string } | null)?.from ?? ROUTES.HOME

  return (
    <div className="space-y-6">
      <CustomerSocialAuth redirectTo={safeNext} />
      <EmailAuthForm
        role="customer"
        initialMode="login"
        allowModeToggle
        allowWhatsApp={whatsappOtpLoginEnabled}
        redirectTo={safeNext}
        submitLabel={{ login: 'Sign In', register: 'Create Account' }}
      />
    </div>
  )
}
