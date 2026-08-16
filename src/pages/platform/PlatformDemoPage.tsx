import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { PLATFORM_SITE } from '@/constants/PLATFORM_SITE'
import { submitPlatformDemoRequest } from '@/services/platformDemoService'

interface DemoFormValues {
  fullName: string
  email: string
  phone: string
  businessName: string
  businessType: string
  interest: string
  planInterest: string
  message: string
}

export default function PlatformDemoPage() {
  const [searchParams] = useSearchParams()
  const [submitted, setSubmitted] = useState(false)

  const defaults = useMemo(
    () => ({
      fullName: '',
      email: '',
      phone: '',
      businessName: '',
      businessType:
        searchParams.get('type') ||
        PLATFORM_SITE.demoForm.businessTypes[0].value,
      interest:
        searchParams.get('interest') ||
        PLATFORM_SITE.demoForm.interests[0].value,
      planInterest: searchParams.get('plan') || '',
      message: '',
    }),
    [searchParams],
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DemoFormValues>({ defaultValues: defaults })

  const onSubmit = async (values: DemoFormValues) => {
    const result = await submitPlatformDemoRequest({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      businessName: values.businessName,
      businessType: values.businessType,
      interest: values.interest,
      planInterest: values.planInterest || null,
      message: values.message,
    })

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Request received. We will contact you soon.')
    setSubmitted(true)
    reset(defaults)
  }

  return (
    <div className="bg-[var(--platform-bg)] pb-16 pt-24 md:pb-24 md:pt-28">
      <Container className="max-w-3xl">
        <h1 className="platform-display text-4xl font-semibold text-[var(--platform-ink)] md:text-5xl">
          {PLATFORM_SITE.demoForm.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--platform-muted)]">
          {PLATFORM_SITE.demoForm.description}
        </p>

        <p className="mt-4 text-sm text-[var(--platform-muted)]">
          Prefer to click around first?{' '}
          <a
            href={PLATFORM_SITE.liveDemo.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[var(--platform-ink)] underline underline-offset-4"
          >
            {PLATFORM_SITE.liveDemo.label}
          </a>
        </p>

        <section className="mt-10 border border-[var(--platform-ink)]/10 bg-white p-5 sm:p-8">
          {submitted ? (
            <div className="space-y-4">
              <p className="rounded-[var(--radius-button)] bg-success/10 px-4 py-3 text-sm text-success">
                Thank you. Your request is in — we will reach out at the email
                or phone you shared.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSubmitted(false)}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Your name"
                  autoComplete="name"
                  error={errors.fullName?.message}
                  {...register('fullName', { required: 'Name is required' })}
                />
                <Input
                  label="Work email"
                  type="email"
                  autoComplete="email"
                  error={errors.email?.message}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email',
                    },
                  })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Phone"
                  type="tel"
                  autoComplete="tel"
                  error={errors.phone?.message}
                  {...register('phone', { required: 'Phone is required' })}
                />
                <Input
                  label="Business name"
                  autoComplete="organization"
                  error={errors.businessName?.message}
                  {...register('businessName', {
                    required: 'Business name is required',
                  })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="businessType"
                    className="text-sm font-medium text-text-primary"
                  >
                    Business type
                  </label>
                  <select
                    id="businessType"
                    className="h-12 rounded-[var(--radius-input)] border border-gray-300 bg-surface px-4 text-sm"
                    {...register('businessType', { required: true })}
                  >
                    {PLATFORM_SITE.demoForm.businessTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="interest"
                    className="text-sm font-medium text-text-primary"
                  >
                    I want to
                  </label>
                  <select
                    id="interest"
                    className="h-12 rounded-[var(--radius-input)] border border-gray-300 bg-surface px-4 text-sm"
                    {...register('interest', { required: true })}
                  >
                    {PLATFORM_SITE.demoForm.interests.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="planInterest"
                  className="text-sm font-medium text-text-primary"
                >
                  Plan interest (optional)
                </label>
                <select
                  id="planInterest"
                  className="h-12 rounded-[var(--radius-input)] border border-gray-300 bg-surface px-4 text-sm"
                  {...register('planInterest')}
                >
                  <option value="">Not sure yet</option>
                  {PLATFORM_SITE.plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>

              <Textarea
                label="Anything we should know?"
                rows={4}
                {...register('message')}
              />

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="bg-[var(--platform-accent)] text-white hover:bg-[var(--platform-accent-hot)]"
              >
                {isSubmitting ? 'Sending…' : 'Submit request'}
              </Button>
            </form>
          )}
        </section>

        <aside className="mt-10 text-sm text-[var(--platform-muted)]">
          <p className="font-medium text-[var(--platform-ink)]">Visit us</p>
          <a
            href={PLATFORM_SITE.contact.mapsDirectionsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block underline-offset-4 hover:underline"
          >
            {PLATFORM_SITE.contact.address}
          </a>
          <p className="mt-3">
            {PLATFORM_SITE.contact.phone} ·{' '}
            <a href={`mailto:${PLATFORM_SITE.contact.email}`}>
              {PLATFORM_SITE.contact.email}
            </a>
          </p>
        </aside>
      </Container>
    </div>
  )
}
