import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { hasActiveSession } from '@/services/authService'

interface RegisterFormValues {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

export function RegisterForm() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const password = watch('password')

  const onSubmit = async (values: RegisterFormValues) => {
    const result = await registerUser({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      password: values.password,
    })

    if (!result.success) {
      toast.error(result.message)
      return
    }

    const sessionActive = await hasActiveSession()

    if (sessionActive) {
      toast.success('Account created successfully!')
      navigate(ROUTES.HOME, { replace: true })
      return
    }

    toast.success('Please check your email to confirm your account.')
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
        label="Phone"
        type="tel"
        autoComplete="tel"
        placeholder="10-digit mobile number"
        error={errors.phone?.message}
        {...register('phone', {
          required: 'Phone number is required',
          pattern: {
            value: /^\d{10}$/,
            message: 'Phone must be exactly 10 digits',
          },
        })}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password', {
          required: 'Password is required',
          minLength: {
            value: 8,
            message: 'Password must be at least 8 characters',
          },
        })}
      />
      <Input
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword', {
          required: 'Please confirm your password',
          validate: (value) =>
            value === password || 'Passwords do not match',
        })}
      />
      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Creating account...' : 'Create Account'}
      </Button>
      <p className="text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
