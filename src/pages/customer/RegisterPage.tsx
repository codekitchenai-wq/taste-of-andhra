import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold">Create Account</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Register with your mobile number. We&apos;ll send a one-time password
        (OTP) to verify it.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  )
}
