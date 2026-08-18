import { EmailAuthForm } from '@/components/auth/EmailAuthForm'
import { useOrganization } from '@/contexts/OrganizationContext'

export function LoginForm() {
  const { storefrontWhatsAppEnabled } = useOrganization()
  return (
    <EmailAuthForm
      role="customer"
      initialMode="login"
      allowModeToggle
      allowWhatsApp={storefrontWhatsAppEnabled}
      submitLabel={{ login: 'Sign In', register: 'Create Account' }}
    />
  )
}
