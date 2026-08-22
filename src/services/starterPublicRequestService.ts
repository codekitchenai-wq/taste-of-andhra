import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import {
  buildStarterEmailInvite,
  normalizeFssaiLicense,
} from '@/utils/websiteStarter'
import { supabase } from '@/services/supabaseClient'

export interface StarterPublicRequestInput {
  restaurantName: string
  ownerName: string
  ownerPhone: string
  ownerEmail: string
  fssaiLicense: string
  city?: string
}

export interface StarterPublicRequestResult {
  resumed: boolean
  organizationId: string
  displayName: string
  slug: string
  homepageUrl: string
  setupUrl: string
  ownerEmail: string
  temporaryPassword: string | null
  whatsappMessage: string
  whatsappUrl: string
  emailSubject: string
  emailBody: string
  mailtoHref: string
  message: string
}

export async function submitStarterPublicRequest(
  input: StarterPublicRequestInput,
): Promise<ServiceResponse<StarterPublicRequestResult>> {
  const restaurantName = input.restaurantName.trim()
  const ownerName = input.ownerName.trim() || restaurantName
  const ownerPhone = input.ownerPhone.trim()
  const ownerEmail = input.ownerEmail.trim().toLowerCase()
  const fssaiLicense = normalizeFssaiLicense(input.fssaiLicense)
  const city = input.city?.trim() || 'India'

  if (!restaurantName) {
    return createErrorResponse('Restaurant name is required.')
  }
  if (ownerPhone.replace(/\D/g, '').length < 10) {
    return createErrorResponse('Enter a valid WhatsApp phone number.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return createErrorResponse('Enter a valid email.')
  }
  if (fssaiLicense.length < 10) {
    return createErrorResponse(
      'Enter a valid FSSAI licence number (at least 10 characters).',
    )
  }

  const appOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://www.directapp.in'

  const { data, error } = await supabase.functions.invoke(
    'starter-public-request',
    {
      body: {
        restaurantName,
        ownerName,
        ownerPhone,
        ownerEmail,
        fssaiLicense,
        city,
        appOrigin,
      },
    },
  )

  if (error) {
    return createErrorResponse(
      error.message ||
        'Could not submit request. Deploy starter-public-request or try again.',
    )
  }

  const payload = (data ?? {}) as Record<string, unknown>
  if (typeof payload.error === 'string' && payload.error) {
    return createErrorResponse(payload.error)
  }

  const setupUrl = String(payload.setupUrl ?? '')
  const displayName = String(payload.displayName ?? restaurantName)
  const tempPassword =
    typeof payload.temporaryPassword === 'string'
      ? payload.temporaryPassword
      : null

  if (!setupUrl) {
    return createErrorResponse(
      'Request did not return a setup link. Please try again or contact support.',
    )
  }

  const email =
    typeof payload.emailSubject === 'string' &&
    typeof payload.emailBody === 'string'
      ? {
          subject: payload.emailSubject,
          body: payload.emailBody,
          mailtoHref: `mailto:${encodeURIComponent(ownerEmail)}?subject=${encodeURIComponent(String(payload.emailSubject))}&body=${encodeURIComponent(String(payload.emailBody))}`,
        }
      : buildStarterEmailInvite({
          displayName,
          setupUrl,
          ownerEmail,
          temporaryPassword: tempPassword,
        })

  return createSuccessResponse({
    resumed: Boolean(payload.resumed),
    organizationId: String(payload.organizationId ?? ''),
    displayName,
    slug: String(payload.slug ?? ''),
    homepageUrl: String(payload.homepageUrl ?? ''),
    setupUrl,
    ownerEmail: String(payload.ownerEmail ?? ownerEmail),
    temporaryPassword: tempPassword,
    whatsappMessage: String(payload.whatsappMessage ?? ''),
    whatsappUrl: String(payload.whatsappUrl ?? ''),
    emailSubject: email.subject,
    emailBody: email.body,
    mailtoHref: email.mailtoHref,
    message: String(
      payload.message ??
        'Request received. Complete setup with the link below.',
    ),
  })
}
