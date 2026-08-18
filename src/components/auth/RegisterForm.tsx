import {
  CustomerAuthLinks,
  EmailAuthForm,
} from '@/components/auth/EmailAuthForm'
import { ROUTES } from '@/constants/ROUTES'
import { useOrganization } from '@/contexts/OrganizationContext'

export function RegisterForm() {
  const { storefrontWhatsAppEnabled } = useOrganization()
  return (
    <EmailAuthForm
      role="customer"
      initialMode="register"
      allowModeToggle={false}
      allowWhatsApp={storefrontWhatsAppEnabled}
      redirectTo={ROUTES.HOME}
      submitLabel={{ login: 'Sign In', register: 'Create Account' }}
      footer={<CustomerAuthLinks mode="register" />}
    />
  )
}
