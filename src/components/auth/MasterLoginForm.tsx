import { Link } from 'react-router-dom'
import { EmailAuthForm } from '@/components/auth/EmailAuthForm'
import { ROUTES } from '@/constants/ROUTES'

export function MasterLoginForm() {
  return (
    <EmailAuthForm
      role="platform_master"
      initialMode="login"
      allowModeToggle={false}
      allowGoogle={false}
      allowWhatsApp={false}
      redirectTo={ROUTES.MASTER.DASHBOARD}
      submitLabel={{
        login: 'Sign In as Superuser',
        register: 'Create Superuser',
      }}
      footer={
        <p className="text-center text-sm text-text-secondary">
          <Link to={ROUTES.HOME} className="text-primary hover:underline">
            Back to website
          </Link>
          {' · '}
          <Link
            to={ROUTES.ADMIN.LOGIN}
            className="text-primary hover:underline"
          >
            Restaurant admin
          </Link>
        </p>
      }
    />
  )
}
