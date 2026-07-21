import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Textarea } from '@/components/ui/Textarea'
import { APP_NAME, CONTACT, OPENING_HOURS } from '@/constants/APP'

interface ContactFormValues {
  name: string
  email: string
  subject: string
  message: string
}

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  })

  const onSubmit = async (values: ContactFormValues) => {
    const body = encodeURIComponent(
      `From: ${values.name}\nEmail: ${values.email}\n\n${values.message}`,
    )
    const subject = encodeURIComponent(values.subject || 'Contact enquiry')
    window.location.href = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`
    toast.success('Opening your email app to send the message')
    setSubmitted(true)
    reset()
  }

  return (
    <Container as="div" className="py-8 md:py-12 lg:py-16">
      <PageHeader
        title="Contact Us"
        description={`We'd love to hear from you. Reach out for orders, feedback, or catering enquiries.`}
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
        <section className="rounded-[var(--radius-card)] bg-surface p-4 shadow-md sm:p-6 md:p-8">
          {submitted && (
            <p className="mb-6 rounded-[var(--radius-button)] bg-success/10 px-4 py-3 text-sm text-success">
              Thank you! If your email app did not open, please write to us at{' '}
              <a href={`mailto:${CONTACT.email}`} className="font-medium underline">
                {CONTACT.email}
              </a>
              .
            </p>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Your Name"
                autoComplete="name"
                error={errors.name?.message}
                {...register('name', { required: 'Name is required' })}
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
                    message: 'Enter a valid email',
                  },
                })}
              />
            </div>
            <Input
              label="Subject"
              error={errors.subject?.message}
              {...register('subject', { required: 'Subject is required' })}
            />
            <Textarea
              label="Message"
              rows={5}
              error={errors.message?.message}
              {...register('message', {
                required: 'Message is required',
                minLength: {
                  value: 10,
                  message: 'Please write at least 10 characters',
                },
              })}
            />
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-[var(--radius-card)] bg-primary p-5 text-white shadow-md md:p-6">
            <h2 className="font-heading text-xl font-semibold">{APP_NAME}</h2>
            <p className="mt-2 text-sm text-white/85">
              Authentic Andhra cuisine, delivered fresh to your doorstep.
            </p>
          </div>

          <div className="space-y-4 rounded-[var(--radius-card)] border border-black/5 bg-surface p-5 shadow-sm md:p-6">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-text-primary">Address</p>
                <a
                  href={CONTACT.mapsDirectionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-sm text-text-secondary transition-colors hover:text-primary"
                >
                  {CONTACT.address}
                </a>
                <a
                  href={CONTACT.mapsDirectionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-sm font-medium text-primary hover:text-primary-dark"
                >
                  Get directions →
                </a>
              </div>
            </div>
            <div className="flex gap-3">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-text-primary">Phone</p>
                <a
                  href={`tel:${CONTACT.phone.replace(/\s/g, '')}`}
                  className="mt-1 block text-sm text-primary hover:text-primary-dark"
                >
                  {CONTACT.phone}
                </a>
              </div>
            </div>
            <div className="flex gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-text-primary">Email</p>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="mt-1 block text-sm text-primary hover:text-primary-dark"
                >
                  {CONTACT.email}
                </a>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-text-primary">Hours</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Mon–Fri: {OPENING_HOURS.weekdays}
                </p>
                <p className="text-sm text-text-secondary">
                  Sat–Sun: {OPENING_HOURS.weekends}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  )
}
