import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'

interface AdminLoginFormValues {
  email: string
  password: string
}

export function AdminLoginForm() {
  const { login, logout } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: AdminLoginFormValues) => {
    const result = await login(values)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    if (result.data.role !== 'admin') {
      await logout()
      toast.error('Access denied. Admin account required.')
      return
    }

    toast.success('Welcome, Admin!')
    navigate(ROUTES.ADMIN.DASHBOARD, { replace: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input
        label="Admin Email"
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
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password', {
          required: 'Password is required',
        })}
      />
      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign In to Admin'}
      </Button>
      <p className="text-center text-sm text-text-secondary">
        <Link to={ROUTES.HOME} className="text-primary hover:underline">
          Back to website
        </Link>
      </p>
    </form>
  )
}
