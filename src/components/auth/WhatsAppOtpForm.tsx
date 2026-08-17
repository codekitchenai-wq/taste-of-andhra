import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  DEFAULT_COUNTRY_CODE,
  WHATSAPP_OTP_LENGTH,
  WHATSAPP_OTP_RESEND_SECONDS,
} from '@/constants/AUTH'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/enums'
import { formatIndianPhone, normalizeIndianPhone } from '@/utils/phone'
import { canAccessPortal } from '@/utils/platformMaster'
import {
  isAddressSetupPath,
  resolveCustomerPostAuthRedirect,
} from '@/utils/postAuthRedirect'

type OtpStep = 'phone' | 'code'

interface WhatsAppOtpFormProps {
  role: UserRole
  redirectTo: string
  /** Collect a name on first-time register. */
  collectName?: boolean
}

function WhatsAppGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#25D366"
        d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.11.82.83-3.04-.2-.32a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m-3.4 4.24c-.21 0-.43.01-.62.1-.6.27-1 .84-1.17 1.41-.3 1 .15 2.3.9 3.37.86 1.22 2.43 2.72 4.5 3.51 1.14.43 1.85.47 2.49.28a2.1 2.1 0 0 0 1.31-1.18c.1-.24.16-.5.1-.76-.05-.18-.16-.3-.32-.41l-1.52-.73c-.17-.08-.32-.06-.44.08l-.6.73c-.08.1-.2.12-.33.08-.54-.22-1.72-.78-2.47-1.52-.64-.64-1.12-1.47-1.28-1.73-.05-.1-.05-.22.04-.32l.5-.64c.08-.1.1-.24.06-.36l-.73-1.74c-.1-.24-.27-.3-.46-.31"
      />
    </svg>
  )
}

export function WhatsAppOtpForm({
  role,
  redirectTo,
  collectName = false,
}: WhatsAppOtpFormProps) {
  const { requestWhatsAppOtp, loginWithWhatsAppOtp, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState<OtpStep>('phone')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  const resolvedRedirect =
    redirectTo ??
    (location.state as { from?: string } | null)?.from ??
    '/'

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  const sendCode = async () => {
    const normalized = normalizeIndianPhone(phone)
    if (!normalized) {
      setError('Enter a valid 10-digit mobile number.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await requestWhatsAppOtp(normalized)

    setIsSubmitting(false)

    if (!result.success) {
      setError(result.message)
      toast.error(result.message)
      return
    }

    setPhone(normalized)
    setStep('code')
    setResendIn(result.data.resendAfterSeconds || WHATSAPP_OTP_RESEND_SECONDS)
    setDevCode(result.data.devCode ?? null)
    setCode(result.data.devCode ?? '')
    toast.success('WhatsApp code sent.')
  }

  const verifyCode = async () => {
    const digits = code.replace(/\D/g, '')
    if (digits.length !== WHATSAPP_OTP_LENGTH) {
      setError(`Enter the ${WHATSAPP_OTP_LENGTH}-digit code from WhatsApp.`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await loginWithWhatsAppOtp({
      phone,
      code: digits,
      fullName: fullName.trim() || undefined,
    })

    setIsSubmitting(false)

    if (!result.success) {
      setError(result.message)
      toast.error(result.message)
      return
    }

    if (!canAccessPortal(result.data.role, role, result.data.email)) {
      await logout()
      const message = `Access denied. A ${role} account is required for this portal.`
      setError(message)
      toast.error(message)
      return
    }

    const next =
      role === 'customer'
        ? await resolveCustomerPostAuthRedirect(resolvedRedirect)
        : resolvedRedirect
    toast.success(
      isAddressSetupPath(next)
        ? 'Welcome! Add a delivery address to finish setup.'
        : 'Welcome back!',
    )
    navigate(next, { replace: true })
  }

  if (step === 'code') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Enter the {WHATSAPP_OTP_LENGTH}-digit code we sent on WhatsApp to{' '}
          <span className="font-medium text-text-primary">
            {DEFAULT_COUNTRY_CODE} {formatIndianPhone(phone)}
          </span>
          .
        </p>
        {devCode ? (
          <p className="rounded-md bg-black/5 px-3 py-2 text-xs text-text-secondary">
            Mock WhatsApp mode — use code{' '}
            <span className="font-mono font-semibold text-text-primary">
              {devCode}
            </span>
          </p>
        ) : null}
        <Input
          label="WhatsApp code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={WHATSAPP_OTP_LENGTH}
          placeholder="6-digit code"
          value={code}
          error={error ?? undefined}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, '').slice(0, WHATSAPP_OTP_LENGTH))
            setError(null)
          }}
        />
        <Button
          type="button"
          fullWidth
          disabled={isSubmitting}
          onClick={() => void verifyCode()}
        >
          {isSubmitting ? 'Verifying...' : 'Verify and continue'}
        </Button>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              setStep('phone')
              setCode('')
              setDevCode(null)
              setError(null)
            }}
          >
            Change number
          </button>
          <button
            type="button"
            className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-text-secondary disabled:no-underline"
            disabled={isSubmitting || resendIn > 0}
            onClick={() => void sendCode()}
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {collectName ? (
        <Input
          label="Your name (first-time setup)"
          autoComplete="name"
          placeholder="Optional if you have signed in before"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      ) : null}
      <div className="flex w-full flex-col gap-2">
        <label
          htmlFor="whatsapp-otp-phone"
          className="text-sm font-medium text-text-primary"
        >
          Mobile number
        </label>
        <div className="flex gap-2">
          <span className="inline-flex h-12 shrink-0 items-center rounded-[var(--radius-input)] border border-gray-300 bg-black/5 px-3 text-sm text-text-secondary">
            {DEFAULT_COUNTRY_CODE}
          </span>
          <input
            id="whatsapp-otp-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={10}
            placeholder="10-digit WhatsApp number"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))
              setError(null)
            }}
            className="h-12 w-full rounded-[var(--radius-input)] border border-gray-300 bg-surface px-4 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-invalid={Boolean(error)}
          />
        </div>
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        fullWidth
        disabled={isSubmitting}
        onClick={() => void sendCode()}
      >
        <WhatsAppGlyph />
        {isSubmitting ? 'Sending code...' : 'Continue with WhatsApp'}
      </Button>
      <p className="text-center text-xs text-text-secondary">
        New customers get an account on first verify. The same number signs you
        in next time.
      </p>
    </div>
  )
}
