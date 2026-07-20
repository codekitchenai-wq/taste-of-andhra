import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Create Account</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Register to place orders and save your preferences.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  )
}
