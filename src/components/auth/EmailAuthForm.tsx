import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { TestCredentialsHint } from '@/components/auth/TestCredentialsHint'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MIN_PASSWORD_LENGTH } from '@/constants/AUTH'
import { DEMO_ACCOUNTS } from '@/constants/DEMO_ACCOUNTS'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/enums'

type AuthMode = 'login' | 'register'

interface EmailAuthFormValues {
  fullName: string
  email: string
  password: string
  phone: string
}

interface EmailAuthFormProps {
  role: UserRole
  /** Starting mode. Customer login page uses login; register page uses register. */
  initialMode?: AuthMode
  /** When false, hide the login/create toggle (e.g. dedicated /register page). */
  allowModeToggle?: boolean
  redirectTo?: string
  submitLabel?: {
    login: string
    register: string
  }
  footer?: ReactNode
}

const DEFAULT_SUBMIT: EmailAuthFormProps['submitLabel'] = {
  login: 'Sign In',
  register: 'Create Account',
}

export function EmailAuthForm({
  role,
  initialMode = 'login',
  allowModeToggle = true,
  redirectTo,
  submitLabel = DEFAULT_SUBMIT,
  footer,
}: EmailAuthFormProps) {
  const { login, register: registerAccount, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<AuthMode>(initialMode)

  const resolvedRedirect =
    redirectTo ??
    (location.state as { from?: string } | null)?.from ??
    (role === 'admin'
      ? ROUTES.ADMIN.DASHBOARD
      : role === 'delivery'
        ? ROUTES.DELIVERY.DASHBOARD
        : ROUTES.HOME)

  const demo = DEMO_ACCOUNTS[role]

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmailAuthFormValues>({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      phone: '',
    },
  })

  const onSubmit = async (values: EmailAuthFormValues) => {
    if (mode === 'login') {
      const result = await login({
        email: values.email,
        password: values.password,
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      if (result.data.role !== role) {
        await logout()
        toast.error(
          `Access denied. A ${role} account is required for this portal.`,
        )
        return
      }

      toast.success('Welcome back!')
      navigate(resolvedRedirect, { replace: true })
      return
    }

    const result = await registerAccount({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      role,
      phone: values.phone || undefined,
    })

    if (!result.success) {
      toast.error(result.message)
      return
    }

    if (result.data.role !== role) {
      await logout()
      toast.error(
        'Account was created with the wrong role. Check the profile trigger and try again.',
      )
      return
    }

    toast.success('Account created successfully!')
    navigate(resolvedRedirect, { replace: true })
  }

  const fillDemoCredentials = (email: string, password: string) => {
    setValue('email', email, { shouldValidate: true })
    setValue('password', password, { shouldValidate: true })

    if (mode === 'register') {
      setValue('fullName', demo.fullName, { shouldValidate: true })
      setValue('phone', demo.phone, { shouldValidate: true })
    }
  }

  return (
    <div>
      {role === 'customer' ? (
        <div className="mb-6 space-y-4">
          <GoogleSignInButton redirectTo={resolvedRedirect} />
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span className="h-px flex-1 bg-black/10" />
            <span>or continue with email</span>
            <span className="h-px flex-1 bg-black/10" />
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {mode === 'register' ? (
          <>
            <Input
              label="Full Name"
              autoComplete="name"
              error={errors.fullName?.message}
              {...register('fullName', {
                required: 'Full name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
              })}
            />
            <Input
              label="Phone (optional)"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="10-digit mobile number"
              error={errors.phone?.message}
              {...register('phone', {
                pattern: {
                  value: /^\d{10}$/,
                  message: 'Enter a valid 10-digit mobile number',
                },
              })}
            />
          </>
        ) : null}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Enter a valid email address',
            },
          })}
        />
        <Input
          label="Password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: MIN_PASSWORD_LENGTH,
              message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
            },
          })}
        />

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting
            ? mode === 'login'
              ? 'Signing in...'
              : 'Creating account...'
            : mode === 'login'
              ? submitLabel.login
              : submitLabel.register}
        </Button>

        {allowModeToggle ? (
          <p className="text-center text-sm text-text-secondary">
            {mode === 'login' ? (
              <>
                Need a new {role} account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-medium text-primary hover:underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        ) : null}

        {footer}
      </form>

      <TestCredentialsHint role={role} onUseCredentials={fillDemoCredentials} />
    </div>
  )
}

/** Customer login/register footer with cross-links when toggle is off. */
export function CustomerAuthLinks({ mode }: { mode: AuthMode }) {
  if (mode === 'register') {
    return (
      <p className="text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    )
  }

  return (
    <p className="text-center text-sm text-text-secondary">
      New here?{' '}
      <Link
        to={ROUTES.REGISTER}
        className="font-medium text-primary hover:underline"
      >
        Create account
      </Link>
    </p>
  )
}
