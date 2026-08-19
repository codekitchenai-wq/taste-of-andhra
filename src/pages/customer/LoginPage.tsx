import { LoginForm } from '@/components/auth/LoginForm'
import { useOrganization } from '@/contexts/OrganizationContext'

export default function LoginPage() {
  const { whatsappOtpLoginEnabled } = useOrganization()
  const methods = [whatsappOtpLoginEnabled ? 'WhatsApp' : null, 'Google', 'email']
    .filter(Boolean)
    .join(', ')
    .replace(/, ([^,]*)$/, ' or $1')

  return (
    <div>
      <h2 className="text-xl font-semibold">Login</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Use {methods}. Each restaurant has its own customer list — join this
        kitchen even if you already order from another.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  )
}
