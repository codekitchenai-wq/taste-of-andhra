import { EmailAuthForm } from '@/components/auth/EmailAuthForm'

export function LoginForm() {
  return (
    <EmailAuthForm
      role="customer"
      initialMode="login"
      allowModeToggle
      submitLabel={{ login: 'Sign In', register: 'Create Account' }}
    />
  )
}
