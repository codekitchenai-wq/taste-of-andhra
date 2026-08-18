import {
  CustomerAuthLinks,
  EmailAuthForm,
} from '@/components/auth/EmailAuthForm'
import { CustomerSocialAuth } from '@/components/auth/CustomerSocialAuth'
import { ROUTES } from '@/constants/ROUTES'
import { useOrganization } from '@/contexts/OrganizationContext'

export function RegisterForm() {
  const { whatsappOtpLoginEnabled } = useOrganization()
  return (
    <div className="space-y-6">
      <CustomerSocialAuth redirectTo={ROUTES.HOME} />
      <EmailAuthForm
        role="customer"
        initialMode="register"
        allowModeToggle={false}
        allowWhatsApp={whatsappOtpLoginEnabled}
        redirectTo={ROUTES.HOME}
        submitLabel={{ login: 'Sign In', register: 'Create Account' }}
        footer={<CustomerAuthLinks mode="register" />}
      />
    </div>
  )
}
