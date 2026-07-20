import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Login</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Sign in to your account to order and track deliveries.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  )
}
