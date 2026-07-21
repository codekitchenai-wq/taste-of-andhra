import { Link } from 'react-router-dom'
import { EmailAuthForm } from '@/components/auth/EmailAuthForm'
import { ROUTES } from '@/constants/ROUTES'

export function AdminLoginForm() {
  return (
    <EmailAuthForm
      role="admin"
      initialMode="login"
      allowModeToggle
      redirectTo={ROUTES.ADMIN.DASHBOARD}
      submitLabel={{
        login: 'Sign In to Admin',
        register: 'Create Admin Account',
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
