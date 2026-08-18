import { RegisterForm } from '@/components/auth/RegisterForm'
import { useOrganization } from '@/contexts/OrganizationContext'

export default function RegisterPage() {
  const { whatsappOtpLoginEnabled } = useOrganization()
  const methods = [
    whatsappOtpLoginEnabled ? 'WhatsApp' : null,
    'Google',
    'email',
  ]
    .filter(Boolean)
    .join(', ')
    .replace(/, ([^,]*)$/, ' or $1')

  return (
    <div>
      <h2 className="text-xl font-semibold">Create Account</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Create an account at this restaurant with {methods}. If you already use
        Google at another kitchen, continue with Google here — we still create
        a separate customer record for this restaurant.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  )
}
