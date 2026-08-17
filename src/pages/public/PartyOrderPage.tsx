import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { CheckCircle2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Textarea } from '@/components/ui/Textarea'
import { useOrganization } from '@/contexts/OrganizationContext'
import * as partyInquiryService from '@/services/partyInquiryService'
import type { PartyMealPreference } from '@/types/PartyInquiry'
import { WhatsAppLink } from '@/components/ui/WhatsAppLink'
import {
  partyOrderWhatsAppMessage,
  storefrontWhatsAppPhone,
  storefrontWhatsAppUrl,
} from '@/utils/storefrontWhatsApp'
import { cn } from '@/utils/cn'
import { storefrontContact } from '@/utils/storefrontCopy'

interface PartyOrderFormValues {
  fullName: string
  email: string
  phone: string
  guestCount: number
  mealPreference: PartyMealPreference
  eventDate: string
  addressLine1: string
  addressLine2: string
  landmark: string
  city: string
  state: string
  pincode: string
  notes: string
}

const MEAL_OPTIONS: {
  value: PartyMealPreference
  label: string
  description: string
}[] = [
  {
    value: 'veg',
    label: 'Vegetarian',
    description: 'Only vegetarian dishes',
  },
  {
    value: 'non_veg',
    label: 'Non-Vegetarian',
    description: 'Chicken, mutton, seafood, etc.',
  },
  {
    value: 'mix',
    label: 'Mix of Veg & Non-Veg',
    description: 'A combined party menu',
  },
]

export default function PartyOrderPage() {
  const contact = storefrontContact(useOrganization())
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PartyOrderFormValues>({
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      guestCount: 20,
      mealPreference: 'mix',
      eventDate: '',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      notes: '',
    },
  })

  const mealPreference = watch('mealPreference')
  const guestCount = watch('guestCount')
  const partyWhatsAppUrl = storefrontWhatsAppPhone(contact)
    ? storefrontWhatsAppUrl(
        contact,
        partyOrderWhatsAppMessage(contact, Number(guestCount) || undefined),
      )
    : null

  const onSubmit = async (values: PartyOrderFormValues) => {
    const result = await partyInquiryService.submitPartyInquiry({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      guestCount: Number(values.guestCount),
      mealPreference: values.mealPreference,
      eventDate: values.eventDate,
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2,
      landmark: values.landmark,
      city: values.city,
      state: values.state,
      pincode: values.pincode,
      notes: values.notes,
    })

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success('Enquiry submitted! We will contact you soon.')
    setSubmitted(true)
    reset()
  }

  return (
    <Container as="div" className="py-8 md:py-12 lg:py-16">
      <PageHeader
        title="Party Order Enquiry"
        description={`Planning a gathering? Share your details and we’ll get back with a custom ${contact.name} menu quote.`}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
        <section className="rounded-[var(--radius-card)] bg-surface p-4 shadow-md sm:p-6 md:p-8">
          {submitted ? (
            <div className="flex flex-col items-center px-4 py-12 text-center sm:py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary md:text-2xl">
                Enquiry received
              </h2>
              <p className="mt-3 max-w-md text-sm text-text-secondary md:text-base">
                Thank you! Our team will call or email you shortly with
                availability and pricing for your party order.
              </p>
              <Button
                type="button"
                className="mt-8"
                onClick={() => setSubmitted(false)}
              >
                Submit another enquiry
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-8"
              noValidate
            >
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold text-text-primary">
                  Contact details
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Full Name"
                    autoComplete="name"
                    error={errors.fullName?.message}
                    {...register('fullName', {
                      required: 'Full name is required',
                      minLength: {
                        value: 2,
                        message: 'Enter at least 2 characters',
                      },
                    })}
                  />
                  <Input
                    label="Phone Number"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                    error={errors.phone?.message}
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^\d{10}$/,
                        message: 'Enter a valid 10-digit phone number',
                      },
                    })}
                  />
                </div>
                <Input
                  label="Email Address"
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
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold text-text-primary">
                  Party details
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Members Expected"
                    type="number"
                    min={1}
                    max={2000}
                    inputMode="numeric"
                    error={errors.guestCount?.message}
                    {...register('guestCount', {
                      required: 'Guest count is required',
                      valueAsNumber: true,
                      min: {
                        value: 1,
                        message: 'At least 1 member is required',
                      },
                      max: {
                        value: 2000,
                        message: 'Please call us for very large groups',
                      },
                    })}
                  />
                  <Input
                    label="Event Date (optional)"
                    type="date"
                    error={errors.eventDate?.message}
                    {...register('eventDate')}
                  />
                </div>

                <div>
                  <p className="mb-3 text-sm font-medium text-text-primary">
                    Meal preference
                  </p>
                  <div
                    className="grid gap-3 sm:grid-cols-3"
                    role="radiogroup"
                    aria-label="Meal preference"
                  >
                    {MEAL_OPTIONS.map((option) => {
                      const selected = mealPreference === option.value

                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() =>
                            setValue('mealPreference', option.value, {
                              shouldValidate: true,
                            })
                          }
                          className={cn(
                            'min-h-[88px] rounded-[var(--radius-button)] border p-3 text-left transition-colors sm:p-4',
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 bg-background hover:border-primary/30',
                          )}
                        >
                          <span className="block text-sm font-semibold text-text-primary">
                            {option.label}
                          </span>
                          <span className="mt-1 block text-xs text-text-secondary">
                            {option.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <input
                    type="hidden"
                    {...register('mealPreference', {
                      required: 'Select a meal preference',
                    })}
                  />
                  {errors.mealPreference && (
                    <p className="mt-2 text-sm text-error">
                      {errors.mealPreference.message}
                    </p>
                  )}
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold text-text-primary">
                  Venue / delivery address
                </legend>
                <Input
                  label="Address Line 1"
                  placeholder="House / hall / street"
                  autoComplete="address-line1"
                  error={errors.addressLine1?.message}
                  {...register('addressLine1', {
                    required: 'Address is required',
                  })}
                />
                <Input
                  label="Address Line 2 (optional)"
                  placeholder="Area, floor, building"
                  autoComplete="address-line2"
                  {...register('addressLine2')}
                />
                <Input
                  label="Nearest Landmark"
                  placeholder="Near metro / temple / school"
                  error={errors.landmark?.message}
                  {...register('landmark', {
                    required: 'Nearest landmark is required',
                    minLength: {
                      value: 2,
                      message: 'Enter a nearby landmark',
                    },
                  })}
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="City"
                    autoComplete="address-level2"
                    error={errors.city?.message}
                    {...register('city', { required: 'City is required' })}
                  />
                  <Input
                    label="State"
                    autoComplete="address-level1"
                    error={errors.state?.message}
                    {...register('state', { required: 'State is required' })}
                  />
                  <div className="sm:col-span-2 lg:col-span-1">
                    <Input
                      label="Pincode"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      error={errors.pincode?.message}
                      {...register('pincode', {
                        required: 'Pincode is required',
                        pattern: {
                          value: /^\d{6}$/,
                          message: 'Enter a valid 6-digit pincode',
                        },
                      })}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold text-text-primary">
                  Additional notes
                </legend>
                <Textarea
                  label="Anything else we should know? (optional)"
                  placeholder="Budget, preferred dishes, timing, decoration, etc."
                  rows={4}
                  {...register('notes')}
                />
              </fieldset>

              <div className="flex flex-col gap-3 border-t border-black/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-secondary">
                  We usually respond within a few hours during open hours.
                </p>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
                </Button>
              </div>
            </form>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-[var(--radius-card)] bg-primary p-5 text-white shadow-md md:p-6">
            <Users className="h-8 w-8 text-accent" aria-hidden="true" />
            <h2 className="mt-3 font-heading text-xl font-semibold">
              Perfect for gatherings
            </h2>
            <p className="mt-2 text-sm text-white/85">
              Birthdays, office parties, family functions — we prepare fresh
              meals for groups of all sizes.
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-black/5 bg-surface p-5 shadow-sm md:p-6">
            <h3 className="font-semibold text-text-primary">
              Prefer WhatsApp?
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              Send your party order details on WhatsApp — we reply quickly on
              mobile.
            </p>
            {partyWhatsAppUrl ? (
              <WhatsAppLink
                href={partyWhatsAppUrl}
                variant="button"
                fullWidth
                className="mt-4"
              >
                Enquire on WhatsApp
              </WhatsAppLink>
            ) : null}
            <a
              href={`tel:${contact.phone.replace(/\s/g, '')}`}
              className="mt-3 inline-flex text-sm font-medium text-primary hover:text-primary-dark"
            >
              Or call {contact.phones.join(' / ')}
            </a>
            {contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                className="mt-2 block text-sm font-medium text-primary hover:text-primary-dark"
              >
                {contact.email}
              </a>
            ) : null}
          </div>
        </aside>
      </div>
    </Container>
  )
}
