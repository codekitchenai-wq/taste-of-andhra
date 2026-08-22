import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Input } from '@/components/ui/Input'
import { ENABLE_STARTER_ONBOARDING } from '@/constants/ARCHITECTURE_GATES'
import { ROUTES } from '@/constants/ROUTES'
import {
  submitStarterPublicRequest,
  type StarterPublicRequestResult,
} from '@/services/starterPublicRequestService'
import { normalizeFssaiLicense } from '@/utils/websiteStarter'

interface FormValues {
  restaurantName: string
  ownerName: string
  ownerPhone: string
  ownerEmail: string
  fssaiLicense: string
  city: string
}

export default function PlatformStarterRequestPage() {
  const [result, setResult] = useState<StarterPublicRequestResult | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      restaurantName: '',
      ownerName: '',
      ownerPhone: '',
      ownerEmail: '',
      fssaiLicense: '',
      city: '',
    },
  })

  if (!ENABLE_STARTER_ONBOARDING) {
    return (
      <div className="bg-[var(--platform-bg)] pb-16 pt-24 md:pb-24 md:pt-28">
        <Container className="max-w-2xl">
          <h1 className="platform-display text-4xl font-semibold text-[var(--platform-ink)]">
            Website Starter
          </h1>
          <p className="mt-4 text-[var(--platform-muted)]">
            Public requests are temporarily unavailable. Please{' '}
            <Link
              to={ROUTES.PLATFORM.DEMO}
              className="font-medium text-[var(--platform-ink)] underline"
            >
              request a demo
            </Link>{' '}
            instead.
          </p>
        </Container>
      </div>
    )
  }

  const onSubmit = async (values: FormValues) => {
    const response = await submitStarterPublicRequest({
      restaurantName: values.restaurantName,
      ownerName: values.ownerName,
      ownerPhone: values.ownerPhone,
      ownerEmail: values.ownerEmail,
      fssaiLicense: values.fssaiLicense,
      city: values.city,
    })

    if (!response.success) {
      toast.error(response.message)
      return
    }

    setResult(response.data)
    toast.success(
      response.data.resumed ? 'Setup link ready again' : 'Request received',
    )
  }

  return (
    <div className="bg-[var(--platform-bg)] pb-16 pt-24 md:pb-24 md:pt-28">
      <Container className="max-w-3xl">
        <h1 className="platform-display text-4xl font-semibold text-[var(--platform-ink)] md:text-5xl">
          Request a Website Starter
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--platform-muted)]">
          Tell us your restaurant and FSSAI licence. We check for duplicates,
          create a private draft site, and send you a setup link. Nothing goes
          live until we review it.
        </p>

        <section className="mt-10 border border-[var(--platform-ink)]/10 bg-white p-5 sm:p-8">
          {result ? (
            <div className="space-y-5">
              <p className="rounded-[var(--radius-button)] bg-success/10 px-4 py-3 text-sm text-success">
                {result.message}
              </p>
              <div className="space-y-2 text-sm text-[var(--platform-ink)]">
                <p>
                  <span className="text-[var(--platform-muted)]">Restaurant:</span>{' '}
                  {result.displayName}
                </p>
                <p>
                  <span className="text-[var(--platform-muted)]">Draft URL:</span>{' '}
                  <a
                    href={result.homepageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {result.homepageUrl}
                  </a>
                </p>
                <p>
                  <span className="text-[var(--platform-muted)]">Setup link:</span>{' '}
                  <a
                    href={result.setupUrl}
                    className="break-all font-medium underline underline-offset-4"
                  >
                    {result.setupUrl}
                  </a>
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a href={result.setupUrl}>
                  <Button
                    type="button"
                    className="w-full bg-[var(--platform-accent)] text-white hover:bg-[var(--platform-accent-hot)] sm:w-auto"
                  >
                    Open setup form
                  </Button>
                </a>
                <a href={result.mailtoHref}>
                  <Button type="button" variant="secondary" className="w-full sm:w-auto">
                    Email instructions to me
                  </Button>
                </a>
                {result.whatsappUrl ? (
                  <a href={result.whatsappUrl} target="_blank" rel="noreferrer">
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                    >
                      Open WhatsApp copy
                    </Button>
                  </a>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    void navigator.clipboard.writeText(result.whatsappMessage)
                  }
                >
                  Copy WhatsApp message
                </Button>
              </div>

              <label className="block text-sm">
                <span className="font-medium text-[var(--platform-ink)]">
                  WhatsApp / email message
                </span>
                <textarea
                  className="mt-1 w-full rounded border border-[var(--platform-ink)]/15 bg-[var(--platform-bg)] p-3 font-mono text-xs"
                  rows={12}
                  readOnly
                  value={result.whatsappMessage || result.emailBody}
                />
              </label>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setResult(null)}
              >
                Submit another request
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <Input
                label="Restaurant / trade name"
                autoComplete="organization"
                error={errors.restaurantName?.message}
                {...register('restaurantName', {
                  required: 'Restaurant name is required',
                })}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Your name"
                  autoComplete="name"
                  error={errors.ownerName?.message}
                  {...register('ownerName', { required: 'Name is required' })}
                />
                <Input
                  label="City"
                  autoComplete="address-level2"
                  error={errors.city?.message}
                  {...register('city')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="WhatsApp phone"
                  type="tel"
                  autoComplete="tel"
                  error={errors.ownerPhone?.message}
                  {...register('ownerPhone', {
                    required: 'WhatsApp number is required',
                    validate: (v) =>
                      v.replace(/\D/g, '').length >= 10 ||
                      'Enter a valid phone number',
                  })}
                />
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  error={errors.ownerEmail?.message}
                  {...register('ownerEmail', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email',
                    },
                  })}
                />
              </div>

              <Input
                label="FSSAI licence number"
                autoComplete="off"
                error={errors.fssaiLicense?.message}
                {...register('fssaiLicense', {
                  required: 'FSSAI licence is required',
                  validate: (v) =>
                    normalizeFssaiLicense(v).length >= 10 ||
                    'Enter a valid FSSAI licence (at least 10 characters)',
                })}
              />
              <p className="text-xs text-[var(--platform-muted)]">
                Used to prevent duplicate restaurants. We do not invent FSSAI
                numbers — use the licence on your FoSCoS certificate.
              </p>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="bg-[var(--platform-accent)] text-white hover:bg-[var(--platform-accent-hot)]"
              >
                {isSubmitting ? 'Checking…' : 'Send request'}
              </Button>
            </form>
          )}
        </section>

        <p className="mt-8 text-sm text-[var(--platform-muted)]">
          Prefer a walkthrough first?{' '}
          <Link
            to={ROUTES.PLATFORM.DEMO}
            className="font-medium text-[var(--platform-ink)] underline underline-offset-4"
          >
            Request a demo
          </Link>
        </p>
      </Container>
    </div>
  )
}
