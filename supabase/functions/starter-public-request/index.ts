// Public Website Starter request (anon).
// Validates FSSAI uniqueness, creates pending_setup org + owner invite,
// returns setup link + WhatsApp/email copy. Does not go live.
//
// Deploy: supabase functions deploy starter-public-request
//
// Body: {
//   restaurantName, ownerName, ownerPhone, ownerEmail, fssaiLicense,
//   city?, appOrigin?
// }

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'

const WEBSITE_STARTER_PLAN_ID = 'b0000000-0000-4000-8000-000000000010'
const WEBSITE_STARTER_PLAN_CODE = 'website_starter'
const PLATFORM_ROOT_DOMAIN = Deno.env.get('PLATFORM_ROOT_DOMAIN')?.trim() ||
  'directapp.in'
const DEFAULT_APP_ORIGIN = Deno.env.get('PLATFORM_WWW_URL')?.trim() ||
  `https://www.${PLATFORM_ROOT_DOMAIN}`

const DISABLED_FEATURES = [
  'orders',
  'customers',
  'offers',
  'reports',
  'delivery_own',
  'delivery_pidge',
  'branches',
  'qr_tables',
  'party_inquiries',
  'loyalty',
  'payments_direct_upi',
  'payments_razorpay',
  'whatsapp_notifications',
  'whatsapp_ordering',
  'sms_notifications',
] as const

function normalizeFssaiLicense(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function generateSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function randomPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  let value = 'Da-'
  for (const byte of bytes) {
    value += alphabet[byte % alphabet.length]
  }
  return value
}

function platformSubdomainUrl(slug: string): string {
  return `https://${slug}.${PLATFORM_ROOT_DOMAIN}`
}

function buildWhatsAppInvite(input: {
  legalName: string
  displayName: string
  homepageUrl: string
  setupUrl: string
  ownerEmail: string
  temporaryPassword?: string | null
}): string {
  const passwordBlock = input.temporaryPassword
    ? `Login email: ${input.ownerEmail}\nTemporary password: ${input.temporaryPassword}\n(Change it after first login.)`
    : `Login email: ${input.ownerEmail}\nOpen the setup link below to continue.`

  return `Welcome to DirectApp

Legal name (FSSAI): *${input.legalName}*
Your website name: *${input.displayName}*
URL: ${input.homepageUrl}

Complete your setup (site stays private until we approve):
${input.setupUrl}

${passwordBlock}

In the setup form, please add:
1) FSSAI certificate if not already on file
2) 3 photos — shop front, interior, food
3) Menu (photo/PDF or dish list)
4) Opening hours + public phone

Reply here if you need help.`
}

function buildEmailInvite(input: {
  displayName: string
  setupUrl: string
  ownerEmail: string
  temporaryPassword?: string | null
}) {
  const subject = `DirectApp setup — ${input.displayName}`
  const passwordBlock = input.temporaryPassword
    ? `Login email: ${input.ownerEmail}\nTemporary password: ${input.temporaryPassword}\n(Change it after first login.)`
    : `Login email: ${input.ownerEmail}\nOpen the setup link below to continue.`
  const body = `Welcome to DirectApp

Your restaurant website draft: ${input.displayName}

Complete setup here (site stays private until we approve):
${input.setupUrl}

${passwordBlock}

In the setup form, please add:
1) FSSAI certificate if not already on file
2) Three photos — shop front, interior, food
3) Menu (photo/PDF or dish list)
4) Opening hours and public phone

Questions? Reply to this email or WhatsApp us.`
  return { subject, body }
}

function whatsappDeepLink(phone: string, message: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 10) digits = `91${digits}`
  else if (digits.startsWith('0') && digits.length === 11) {
    digits = `91${digits.slice(1)}`
  }
  if (!digits) return ''
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) throw error
    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    )
    if (found) return found
    if (data.users.length < 200) break
  }
  return null
}

async function suggestSlug(
  admin: ReturnType<typeof createClient>,
  name: string,
  city: string,
): Promise<string> {
  const { data, error } = await admin.rpc('suggest_organization_slug', {
    proposed_name: name,
    city,
  })
  if (!error && typeof data === 'string' && data.trim()) {
    return data.trim()
  }
  const base = generateSlug(name) || 'restaurant'
  const cityPart = generateSlug(city).replace(/-/g, '')
  let candidate = base
  for (let n = 0; n < 40; n += 1) {
    const { data: existing } = await admin
      .from('organizations')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!existing) return candidate
    candidate = n === 0 && cityPart ? `${base}-${cityPart}` : `${base}-${n + 1}`
  }
  return `${base}-${Date.now().toString(36)}`
}

async function ensureOwner(
  admin: ReturnType<typeof createClient>,
  input: {
    organizationId: string
    ownerEmail: string
    ownerName: string
    ownerPhone: string
  },
): Promise<{ temporaryPassword: string | null; existingUser: boolean }> {
  const existing = await findUserByEmail(admin, input.ownerEmail)
  let userId = existing?.id ?? null
  let temporaryPassword: string | null = null
  const existingUser = Boolean(existing)

  if (!existing) {
    temporaryPassword = randomPassword()
    const created = await admin.auth.admin.createUser({
      email: input.ownerEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: input.ownerName,
        role: 'admin',
        phone: input.ownerPhone || null,
      },
      app_metadata: { role: 'admin' },
    })
    if (created.error || !created.data.user) {
      throw new Error(
        created.error?.message || 'Unable to create owner login.',
      )
    }
    userId = created.data.user.id
  }

  if (!userId) throw new Error('Unable to resolve owner user.')

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      full_name: input.ownerName,
      email: input.ownerEmail,
      phone: input.ownerPhone || null,
      role: 'admin',
      is_active: true,
    },
    { onConflict: 'id' },
  )
  if (profileError) throw new Error(profileError.message)

  const { error: memberError } = await admin.from('organization_members').upsert(
    {
      organization_id: input.organizationId,
      user_id: userId,
      role: 'restaurant_owner',
      is_active: true,
    },
    { onConflict: 'organization_id,user_id' },
  )
  if (memberError) throw new Error(memberError.message)

  return { temporaryPassword, existingUser }
}

async function createInvite(
  admin: ReturnType<typeof createClient>,
  input: {
    organizationId: string
    ownerEmail: string
    ownerPhone: string
    temporaryPassword: string | null
  },
): Promise<string> {
  const token = randomToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { error } = await admin.from('onboarding_invites').insert({
    organization_id: input.organizationId,
    token,
    owner_email: input.ownerEmail,
    owner_phone: input.ownerPhone,
    temporary_password: input.temporaryPassword,
    expires_at: expiresAt.toISOString(),
  })
  if (error) throw new Error(error.message)
  return token
}

async function enableStarterEntitlements(
  admin: ReturnType<typeof createClient>,
  organizationId: string,
) {
  const enabled = ['menu', 'settings', 'ai_menu_import'].map((feature_key) => ({
    organization_id: organizationId,
    feature_key,
    enabled: true,
    source: 'plan',
    notes: 'Website Starter',
  }))
  const disabled = DISABLED_FEATURES.map((feature_key) => ({
    organization_id: organizationId,
    feature_key,
    enabled: false,
    source: 'manual',
    notes: 'Website Starter: ordering modules off',
  }))
  await admin.from('organization_entitlements').upsert(
    [...enabled, ...disabled],
    { onConflict: 'organization_id,feature_key' },
  )
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Server is missing Supabase credentials.', 500)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body.')
  }

  const restaurantName = String(body.restaurantName ?? '').trim()
  const ownerName = String(body.ownerName ?? '').trim() || restaurantName
  const ownerPhone = String(body.ownerPhone ?? '').trim()
  const ownerEmail = String(body.ownerEmail ?? '').trim().toLowerCase()
  const fssaiLicense = normalizeFssaiLicense(String(body.fssaiLicense ?? ''))
  const city = String(body.city ?? '').trim() || 'India'
  const appOrigin = String(body.appOrigin ?? '')
    .trim()
    .replace(/\/$/, '') || DEFAULT_APP_ORIGIN

  if (!restaurantName) {
    return errorResponse('Restaurant name is required.')
  }
  if (!ownerPhone || ownerPhone.replace(/\D/g, '').length < 10) {
    return errorResponse('A valid WhatsApp phone number is required.')
  }
  if (!ownerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return errorResponse('A valid email is required.')
  }
  if (!fssaiLicense || fssaiLicense.length < 10) {
    return errorResponse(
      'A valid FSSAI licence number is required (at least 10 characters).',
    )
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: existingOrgs, error: dupeError } = await admin
    .from('organizations')
    .select(
      'id, name, slug, status, onboarding_status, fssai_license, homepage_url',
    )
    .eq('fssai_license', fssaiLicense)
    .limit(5)

  if (dupeError) {
    return errorResponse(dupeError.message, 500)
  }

  const existing = existingOrgs?.[0] ?? null
  if (existing) {
    const onboarding = String(existing.onboarding_status ?? '')
    const isOpen =
      onboarding === 'pending_setup' ||
      onboarding === 'pending_review' ||
      onboarding === 'intake' ||
      onboarding === 'rejected'

    if (!isOpen) {
      return errorResponse(
        'This FSSAI licence is already registered on DirectApp. Contact support if you need access.',
        409,
      )
    }

    try {
      const owner = await ensureOwner(admin, {
        organizationId: existing.id,
        ownerEmail,
        ownerName,
        ownerPhone,
      })
      const token = await createInvite(admin, {
        organizationId: existing.id,
        ownerEmail,
        ownerPhone,
        temporaryPassword: owner.existingUser ? null : owner.temporaryPassword,
      })
      const setupUrl = `${appOrigin}/setup/${token}`
      const homepageUrl =
        existing.homepage_url || platformSubdomainUrl(existing.slug)
      const whatsappMessage = buildWhatsAppInvite({
        legalName: existing.name,
        displayName: existing.name,
        homepageUrl,
        setupUrl,
        ownerEmail,
        temporaryPassword: owner.existingUser ? null : owner.temporaryPassword,
      })
      const email = buildEmailInvite({
        displayName: existing.name,
        setupUrl,
        ownerEmail,
        temporaryPassword: owner.existingUser ? null : owner.temporaryPassword,
      })

      return jsonResponse({
        resumed: true,
        organizationId: existing.id,
        displayName: existing.name,
        slug: existing.slug,
        homepageUrl,
        setupUrl,
        ownerEmail,
        temporaryPassword: owner.existingUser ? null : owner.temporaryPassword,
        whatsappMessage,
        whatsappUrl: whatsappDeepLink(ownerPhone, whatsappMessage),
        emailSubject: email.subject,
        emailBody: email.body,
        message:
          'You already have an open application for this FSSAI. Here is your setup link again.',
      })
    } catch (err) {
      return errorResponse(
        err instanceof Error ? err.message : 'Unable to resume setup.',
        500,
      )
    }
  }

  try {
    const slug = await suggestSlug(admin, restaurantName, city)
    const homepageUrl = platformSubdomainUrl(slug)
    const settings: Record<string, unknown> = {
      product_track: WEBSITE_STARTER_PLAN_CODE,
      fssai_enforcement: true,
      max_menu_items: 15,
      gallery: { front: null, interior: null, food: null },
      owner_name: ownerName,
      owner_phone: ownerPhone,
      city,
      storefront_whatsapp_enabled: Boolean(ownerPhone),
      restaurant_whatsapp_phone: ownerPhone,
      whatsapp_otp_login_enabled: false,
      request_source: 'public_form',
    }

    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({
        name: restaurantName,
        legal_name: restaurantName,
        slug,
        status: 'trialing',
        phone: ownerPhone,
        email: ownerEmail,
        address: city,
        branding: {},
        opening_hours: {},
        settings,
        homepage_mode: 'platform_subdomain',
        custom_domain: '',
        homepage_url: homepageUrl,
        fssai_license: fssaiLicense,
        onboarding_status: 'pending_setup',
      })
      .select('id, name, slug')
      .single()

    if (orgError || !org) {
      if (orgError?.message?.toLowerCase().includes('duplicate')) {
        return errorResponse(
          'This FSSAI licence or URL slug is already taken.',
          409,
        )
      }
      return errorResponse(
        orgError?.message || 'Unable to create restaurant.',
        500,
      )
    }

    const periodEnd = new Date()
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    const { error: subError } = await admin.from('subscriptions').insert({
      organization_id: org.id,
      plan_id: WEBSITE_STARTER_PLAN_ID,
      status: 'trialing',
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      provider: 'manual',
      provider_ref: 'website-starter-public-request',
    })
    if (subError) {
      return errorResponse(
        'Restaurant created but subscription failed.',
        500,
      )
    }

    await enableStarterEntitlements(admin, org.id)

    const owner = await ensureOwner(admin, {
      organizationId: org.id,
      ownerEmail,
      ownerName,
      ownerPhone,
    })
    const token = await createInvite(admin, {
      organizationId: org.id,
      ownerEmail,
      ownerPhone,
      temporaryPassword: owner.existingUser ? null : owner.temporaryPassword,
    })
    const setupUrl = `${appOrigin}/setup/${token}`
    const whatsappMessage = buildWhatsAppInvite({
      legalName: restaurantName,
      displayName: restaurantName,
      homepageUrl,
      setupUrl,
      ownerEmail,
      temporaryPassword: owner.existingUser ? null : owner.temporaryPassword,
    })
    const email = buildEmailInvite({
      displayName: restaurantName,
      setupUrl,
      ownerEmail,
      temporaryPassword: owner.existingUser ? null : owner.temporaryPassword,
    })

    const { error: auditError } = await admin.from('starter_public_requests').insert({
      organization_id: org.id,
      restaurant_name: restaurantName,
      owner_name: ownerName,
      owner_email: ownerEmail,
      owner_phone: ownerPhone,
      fssai_license: fssaiLicense,
      city,
      status: 'created',
    })
    if (auditError) {
      console.warn('starter_public_requests audit insert skipped', auditError.message)
    }

    return jsonResponse({
      resumed: false,
      organizationId: org.id,
      displayName: org.name,
      slug: org.slug,
      homepageUrl,
      setupUrl,
      ownerEmail,
      temporaryPassword: owner.existingUser ? null : owner.temporaryPassword,
      whatsappMessage,
      whatsappUrl: whatsappDeepLink(ownerPhone, whatsappMessage),
      emailSubject: email.subject,
      emailBody: email.body,
      message:
        'Request received. Your draft site is ready — complete setup with the link below. We review before it goes live.',
    })
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Unable to process request.',
      500,
    )
  }
})
