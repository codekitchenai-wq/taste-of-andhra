import { EmailAuthForm } from '@/components/auth/EmailAuthForm'
import { useOrganization } from '@/contexts/OrganizationContext'

export function LoginForm() {
  const { whatsappOtpLoginEnabled } = useOrganization()

  return (
    <EmailAuthForm
      role="customer"
      initialMode="login"
      allowModeToggle
      allowWhatsApp={whatsappOtpLoginEnabled}
      submitLabel={{ login: 'Sign In', register: 'Create Account' }}
    />
  )
}
