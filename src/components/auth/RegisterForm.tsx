import {
  CustomerAuthLinks,
  EmailAuthForm,
} from '@/components/auth/EmailAuthForm'
import { ROUTES } from '@/constants/ROUTES'

export function RegisterForm() {
  return (
    <EmailAuthForm
      role="customer"
      initialMode="register"
      allowModeToggle={false}
      redirectTo={ROUTES.HOME}
      submitLabel={{ login: 'Sign In', register: 'Create Account' }}
      footer={<CustomerAuthLinks mode="register" />}
    />
  )
}
