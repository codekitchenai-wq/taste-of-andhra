import { Link } from 'react-router-dom'
import { EmailAuthForm } from '@/components/auth/EmailAuthForm'
import { ROUTES } from '@/constants/ROUTES'

export function DeliveryLoginForm() {
  return (
    <EmailAuthForm
      role="delivery"
      initialMode="login"
      allowModeToggle
      redirectTo={ROUTES.DELIVERY.DASHBOARD}
      submitLabel={{
        login: 'Sign In',
        register: 'Create Delivery Account',
      }}
      footer={
        <p className="text-center text-sm text-text-secondary">
          <Link to={ROUTES.HOME} className="text-primary hover:underline">
            Back to website
          </Link>
        </p>
      }
    />
  )
}
