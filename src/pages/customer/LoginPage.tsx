import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Login</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Sign in with Google, or use your email and password. Create a new
        customer account if you need one.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  )
}
