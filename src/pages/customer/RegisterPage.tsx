import { RegisterForm } from '@/components/auth/RegisterForm'
import { useOrganization } from '@/contexts/OrganizationContext'

export default function RegisterPage() {
  const { whatsappOtpLoginEnabled } = useOrganization()
  const methods = [whatsappOtpLoginEnabled ? 'WhatsApp' : null, 'Google', 'email']
    .filter(Boolean)
    .join(', ')
    .replace(/, ([^,]*)$/, ' or $1')

  return (
    <div>
      <h2 className="text-xl font-semibold">Create Account</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Create an account at this restaurant with {methods}. We keep a separate
        customer record for each kitchen you join.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  )
}
