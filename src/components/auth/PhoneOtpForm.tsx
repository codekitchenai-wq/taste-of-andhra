import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { OTP_LENGTH, OTP_RESEND_SECONDS } from '@/constants/AUTH'
import { ROUTES } from '@/constants/ROUTES'
import { useAuth } from '@/hooks/useAuth'
import { formatIndianPhone } from '@/utils/phone'

type OtpStep = 'phone' | 'otp'

interface PhoneOtpFormProps {
  mode: 'login' | 'register'
}

interface PhoneStepValues {
  fullName?: string
  phone: string
}

interface OtpStepValues {
  otp: string
}

export function PhoneOtpForm({ mode }: PhoneOtpFormProps) {
  const { sendOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? ROUTES.HOME

  const [step, setStep] = useState<OtpStep>('phone')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const phoneForm = useForm<PhoneStepValues>({
    defaultValues: {
      fullName: '',
      phone: '',
    },
  })

  const otpForm = useForm<OtpStepValues>({
    defaultValues: { otp: '' },
  })

  useEffect(() => {
    if (resendIn <= 0) return

    const timer = window.setInterval(() => {
      setResendIn((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [resendIn])

  const handleSendOtp = async (values: PhoneStepValues) => {
    setIsSending(true)

    const result = await sendOtp({
      phone: values.phone,
      fullName: mode === 'register' ? values.fullName : undefined,
    })

    setIsSending(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setPhone(values.phone)
    setFullName(values.fullName?.trim() ?? '')
    setStep('otp')
    setResendIn(OTP_RESEND_SECONDS)
    otpForm.reset({ otp: '' })
    toast.success(`OTP sent to +91 ${formatIndianPhone(values.phone)}`)
  }

  const handleResendOtp = async () => {
    if (resendIn > 0) return

    setIsSending(true)

    const result = await sendOtp({
      phone,
      fullName: mode === 'register' ? fullName : undefined,
    })

    setIsSending(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    setResendIn(OTP_RESEND_SECONDS)
    toast.success('OTP resent')
  }

  const handleVerifyOtp = async (values: OtpStepValues) => {
    setIsVerifying(true)

    const result = await verifyOtp({
      phone,
      otp: values.otp,
      fullName: mode === 'register' ? fullName : undefined,
    })

    setIsVerifying(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(
      mode === 'register' ? 'Account created successfully!' : 'Welcome back!',
    )
    navigate(redirectTo, { replace: true })
  }

  const handleChangePhone = () => {
    setStep('phone')
    otpForm.reset({ otp: '' })
  }

  if (step === 'phone') {
    return (
      <form
        onSubmit={phoneForm.handleSubmit(handleSendOtp)}
        className="space-y-4"
        noValidate
      >
        {mode === 'register' && (
          <Input
            label="Full Name"
            autoComplete="name"
            error={phoneForm.formState.errors.fullName?.message}
            {...phoneForm.register('fullName', {
              required: 'Full name is required',
              minLength: {
                value: 2,
                message: 'Name must be at least 2 characters',
              },
            })}
          />
        )}

        <Input
          label="Mobile Number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10-digit mobile number"
          error={phoneForm.formState.errors.phone?.message}
          {...phoneForm.register('phone', {
            required: 'Mobile number is required',
            pattern: {
              value: /^\d{10}$/,
              message: 'Enter a valid 10-digit mobile number',
            },
          })}
        />

        <Button type="submit" fullWidth disabled={isSending}>
          {isSending ? 'Sending OTP...' : 'Send OTP'}
        </Button>

        <p className="text-center text-sm text-text-secondary">
          {mode === 'register' ? (
            <>
              Already have an account?{' '}
              <Link
                to={ROUTES.LOGIN}
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{' '}
              <Link
                to={ROUTES.REGISTER}
                className="font-medium text-primary hover:underline"
              >
                Create account
              </Link>
            </>
          )}
        </p>
      </form>
    )
  }

  return (
    <form
      onSubmit={otpForm.handleSubmit(handleVerifyOtp)}
      className="space-y-4"
      noValidate
    >
      <div className="rounded-[var(--radius-card)] bg-background px-4 py-3 text-sm text-text-secondary">
        OTP sent to{' '}
        <span className="font-medium text-text-primary">
          +91 {formatIndianPhone(phone)}
        </span>
        <button
          type="button"
          onClick={handleChangePhone}
          className="ml-2 font-medium text-primary hover:text-primary-dark"
        >
          Change
        </button>
      </div>

      <Input
        label={`Enter ${OTP_LENGTH}-digit OTP`}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        placeholder="• • • • • •"
        error={otpForm.formState.errors.otp?.message}
        {...otpForm.register('otp', {
          required: 'OTP is required',
          pattern: {
            value: new RegExp(`^\\d{${OTP_LENGTH}}$`),
            message: `Enter the ${OTP_LENGTH}-digit OTP`,
          },
        })}
      />

      <Button type="submit" fullWidth disabled={isVerifying}>
        {isVerifying
          ? 'Verifying...'
          : mode === 'register'
            ? 'Verify & Create Account'
            : 'Verify & Sign In'}
      </Button>

      <div className="text-center text-sm text-text-secondary">
        {resendIn > 0 ? (
          <p>Resend OTP in {resendIn}s</p>
        ) : (
          <button
            type="button"
            onClick={() => void handleResendOtp()}
            disabled={isSending}
            className="font-medium text-primary hover:text-primary-dark disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Resend OTP'}
          </button>
        )}
      </div>
    </form>
  )
}
