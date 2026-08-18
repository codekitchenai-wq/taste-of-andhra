import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Login</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Use Google or email. Each restaurant has its own customer list — join
        this kitchen even if you already order from another. Google is the same
        login, and we create your account here on first visit.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  )
}
