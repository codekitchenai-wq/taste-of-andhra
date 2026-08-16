import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import { PLATFORM_SITE } from '@/constants/PLATFORM_SITE'
import { supabase } from '@/services/supabaseClient'

export interface PlatformDemoRequestInput {
  fullName: string
  email: string
  phone: string
  businessName: string
  businessType: string
  interest: string
  planInterest: string | null
  message: string
}

function openMailtoFallback(payload: {
  full_name: string
  email: string
  phone: string
  business_name: string
  business_type: string
  interest: string
  plan_interest: string | null
  message: string | null
}) {
  const subject = encodeURIComponent(
    `DirectApp ${payload.interest}: ${payload.business_name}`,
  )
  const body = encodeURIComponent(
    [
      `Name: ${payload.full_name}`,
      `Email: ${payload.email}`,
      `Phone: ${payload.phone}`,
      `Business: ${payload.business_name}`,
      `Type: ${payload.business_type}`,
      `Interest: ${payload.interest}`,
      `Plan: ${payload.plan_interest ?? 'n/a'}`,
      '',
      payload.message ?? '',
    ].join('\n'),
  )
  window.location.href = `mailto:${PLATFORM_SITE.contact.email}?subject=${subject}&body=${body}`
}

export async function submitPlatformDemoRequest(
  input: PlatformDemoRequestInput,
): Promise<ServiceResponse<{ id: string } | null>> {
  const payload = {
    full_name: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    business_name: input.businessName.trim(),
    business_type: input.businessType.trim(),
    interest: input.interest.trim(),
    plan_interest: input.planInterest?.trim() || null,
    message: input.message.trim() || null,
  }

  try {
    const { data, error } = await supabase
      .from('platform_demo_requests')
      .insert(payload)
      .select('id')
      .maybeSingle()

    if (!error && data?.id) {
      return createSuccessResponse({ id: data.id as string })
    }
  } catch {
    // Table may not exist yet — fall through to mailto.
  }

  openMailtoFallback(payload)
  return createSuccessResponse(null)
}
