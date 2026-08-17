// Public customer login via WhatsApp OTP (no DLT).
// Deploy: supabase functions deploy whatsapp-otp --no-verify-jwt
//
// Body (send):   { action: "send", phone }
// Body (verify): { action: "verify", phone, code, fullName? }
//
// Requires the restaurant WhatsApp connection plus an approved Meta
// Authentication (or utility) template named `login_otp` (override with
// WHATSAPP_OTP_TEMPLATE_NAME / WHATSAPP_OTP_TEMPLATE_LANGUAGE).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  isMockWhatsAppMode,
  sendWhatsAppAuthenticationOtp,
} from '../_shared/whatsapp.ts'

const DEFAULT_ORG_ID = 'a0000000-0000-4000-8000-000000000001'
const OTP_LENGTH = 6
const OTP_TTL_MS = 5 * 60 * 1000
const RESEND_COOLDOWN_MS = 45 * 1000
const MAX_SENDS_PER_WINDOW = 5
const SEND_WINDOW_MS = 10 * 60 * 1000
const SYNTHETIC_EMAIL_DOMAIN = 'otp.invalid'

type AdminClient = ReturnType<typeof createClient>

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

function parseIndianMobile(input: string): { local: string; e164: string } | null {
  const digits = digitsOnly(input)
  let local = digits
  if (digits.length === 12 && digits.startsWith('91')) {
    local = digits.slice(2)
  }
  if (!/^[6-9]\d{9}$/.test(local)) return null
  return { local, e164: `+91${local}` }
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return diff === 0
}

function randomOtp(): string {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return String(100000 + (bytes[0] % 900000))
}

function randomPassword(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}Aa1!`
}

function otpPepper(): string {
  return (
    Deno.env.get('WHATSAPP_OTP_PEPPER') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    'toa-whatsapp-otp'
  )
}

function hashPayload(e164: string, code: string): Promise<string> {
  return sha256Hex(`${e164}:${code}:${otpPepper()}`)
}

function isMockDelivery(accessToken?: string | null): boolean {
  return isMockWhatsAppMode(accessToken) ||
    (Deno.env.get('WHATSAPP_OTP_DEV_RETURN_CODE') ?? '').toLowerCase() === 'true'
}

async function loadWhatsAppCredentials(
  admin: AdminClient,
  organizationId: string,
): Promise<{
  accessToken: string | null
  phoneNumberId: string | null
  connectionStatus: string | null
}> {
  const { data } = await admin
    .from('organization_whatsapp_configs')
    .select('access_token, phone_number_id, connection_status')
    .eq('organization_id', organizationId)
    .maybeSingle()

  return {
    accessToken: (data?.access_token as string | null) ?? null,
    phoneNumberId: (data?.phone_number_id as string | null) ?? null,
    connectionStatus: (data?.connection_status as string | null) ?? null,
  }
}

async function handleSend(
  admin: AdminClient,
  phoneInput: string,
): Promise<Response> {
  const parsed = parseIndianMobile(phoneInput)
  if (!parsed) {
    return errorResponse('Enter a valid 10-digit Indian mobile number.')
  }

  const organizationId =
    Deno.env.get('WHATSAPP_OTP_ORGANIZATION_ID') ?? DEFAULT_ORG_ID

  const now = Date.now()
  const windowStart = new Date(now - SEND_WINDOW_MS).toISOString()

  const { count: recentCount, error: countError } = await admin
    .from('auth_whatsapp_otps')
    .select('id', { count: 'exact', head: true })
    .eq('phone_e164', parsed.e164)
    .gte('created_at', windowStart)

  if (countError) {
    return errorResponse('Unable to start WhatsApp login. Please try again.', 500)
  }

  if ((recentCount ?? 0) >= MAX_SENDS_PER_WINDOW) {
    return errorResponse(
      'Too many OTP requests. Please wait a few minutes and try again.',
      429,
    )
  }

  const { data: latest } = await admin
    .from('auth_whatsapp_otps')
    .select('created_at')
    .eq('phone_e164', parsed.e164)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest?.created_at) {
    const elapsed = now - new Date(latest.created_at).getTime()
    if (elapsed < RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
      return jsonResponse(
        {
          error: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
          resendAfterSeconds: retryAfterSeconds,
        },
        429,
      )
    }
  }

  const credentials = await loadWhatsAppCredentials(admin, organizationId)
  const mock = isMockDelivery(credentials.accessToken)

  if (!mock) {
    if (
      credentials.connectionStatus !== 'connected' ||
      !credentials.accessToken ||
      !credentials.phoneNumberId
    ) {
      return errorResponse(
        'WhatsApp login is not connected yet. Use Google or email, or ask the restaurant to connect WhatsApp.',
        503,
      )
    }
  }

  await admin
    .from('auth_whatsapp_otps')
    .delete()
    .eq('phone_e164', parsed.e164)
    .is('consumed_at', null)

  await admin
    .from('auth_whatsapp_otps')
    .delete()
    .lt('expires_at', new Date(now - 24 * 60 * 60 * 1000).toISOString())

  const code = randomOtp()
  const codeHash = await hashPayload(parsed.e164, code)
  const expiresAt = new Date(now + OTP_TTL_MS).toISOString()

  const { error: insertError } = await admin.from('auth_whatsapp_otps').insert({
    phone_e164: parsed.e164,
    phone_local: parsed.local,
    code_hash: codeHash,
    expires_at: expiresAt,
  })

  if (insertError) {
    return errorResponse('Unable to create a login code. Please try again.', 500)
  }

  if (!mock) {
    const templateName =
      Deno.env.get('WHATSAPP_OTP_TEMPLATE_NAME') ?? 'login_otp'
    const languageCode =
      Deno.env.get('WHATSAPP_OTP_TEMPLATE_LANGUAGE') ?? 'en'

    const sent = await sendWhatsAppAuthenticationOtp({
      phoneNumberId: credentials.phoneNumberId as string,
      accessToken: credentials.accessToken as string,
      toE164: parsed.e164,
      templateName,
      languageCode,
      otpCode: code,
    })

    if (!sent.ok) {
      await admin
        .from('auth_whatsapp_otps')
        .delete()
        .eq('phone_e164', parsed.e164)
        .eq('code_hash', codeHash)

      return errorResponse(
        sent.error ??
          'Unable to send the WhatsApp code. Check that the login_otp template is approved.',
        502,
      )
    }
  } else {
    console.log(
      `[whatsapp-otp:mock] ${parsed.e164} code=${code} expires=${expiresAt}`,
    )
  }

  return jsonResponse({
    ok: true,
    resendAfterSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
    ...(mock ? { devCode: code } : {}),
  })
}

async function findUserId(
  admin: AdminClient,
  local: string,
  e164: string,
): Promise<string | null> {
  const { data, error } = await admin.rpc('find_user_id_by_phone', {
    p_local: local,
    p_e164: e164,
  })

  if (error) {
    console.error('find_user_id_by_phone', error.message)
    return null
  }

  return typeof data === 'string' && data.length > 0 ? data : null
}

function syntheticEmailFor(local: string): string {
  return `91${local}@${SYNTHETIC_EMAIL_DOMAIN}`
}

function isRealEmail(email: string | null | undefined): email is string {
  return Boolean(
    email &&
      email.includes('@') &&
      !email.toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`),
  )
}

type PreparedUser =
  | { userId: string; kind: 'password'; email: string; password: string }
  | { userId: string; kind: 'magiclink'; tokenHash: string }

async function createMagicLinkToken(
  admin: AdminClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (error) {
    console.error('generateLink', error.message)
    return null
  }
  return data.properties?.hashed_token ?? null
}

async function ensureCustomerUser(
  admin: AdminClient,
  local: string,
  e164: string,
  fullName: string,
  password: string,
): Promise<PreparedUser | Response> {
  const existingId = await findUserId(admin, local, e164)
  const metadata = {
    full_name: fullName,
    role: 'customer',
    phone: local,
  }

  if (existingId) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role, is_active, email, full_name')
      .eq('id', existingId)
      .maybeSingle()

    if (profile && profile.role !== 'customer') {
      return errorResponse(
        'This number belongs to a staff account. Sign in with email instead.',
        403,
      )
    }

    if (profile && profile.is_active === false) {
      return errorResponse('Your account has been deactivated.')
    }

    const profilePatch: Record<string, string> = { phone: local }
    if (profile?.full_name === 'Customer' && fullName !== 'Customer') {
      profilePatch.full_name = fullName
    }
    await admin.from('profiles').update(profilePatch).eq('id', existingId)

    if (isRealEmail(profile?.email)) {
      const tokenHash = await createMagicLinkToken(admin, profile.email)
      if (!tokenHash) {
        return errorResponse(
          'Unable to sign in with this number. Please try email login.',
          500,
        )
      }
      return { userId: existingId, kind: 'magiclink', tokenHash }
    }

    const email = syntheticEmailFor(local)
    const updated = await admin.auth.admin.updateUserById(existingId, {
      password,
      email,
      email_confirm: true,
      user_metadata: {
        ...metadata,
        full_name:
          fullName !== 'Customer'
            ? fullName
            : (profile?.full_name ?? 'Customer'),
      },
    })
    if (updated.error) {
      return errorResponse(
        'Unable to sign in with this number. Please try email login.',
        500,
      )
    }
    return { userId: existingId, kind: 'password', email, password }
  }

  const email = syntheticEmailFor(local)
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    phone: e164,
    phone_confirm: true,
    user_metadata: metadata,
  })

  if (!created.error && created.data.user) {
    return { userId: created.data.user.id, kind: 'password', email, password }
  }

  const message = (created.error?.message ?? '').toLowerCase()
  if (message.includes('already')) {
    const raced = await findUserId(admin, local, e164)
    if (raced) {
      const { data: profile } = await admin
        .from('profiles')
        .select('email')
        .eq('id', raced)
        .maybeSingle()
      if (isRealEmail(profile?.email)) {
        const tokenHash = await createMagicLinkToken(admin, profile.email)
        if (tokenHash) {
          return { userId: raced, kind: 'magiclink', tokenHash }
        }
      }
      const updated = await admin.auth.admin.updateUserById(raced, {
        password,
        email,
        email_confirm: true,
        user_metadata: metadata,
      })
      if (!updated.error) {
        return { userId: raced, kind: 'password', email, password }
      }
    }
  }

  const fallback = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: metadata,
  })

  if (!fallback.error && fallback.data.user) {
    return { userId: fallback.data.user.id, kind: 'password', email, password }
  }

  return errorResponse(
    created.error?.message ??
      fallback.error?.message ??
      'Unable to create your account. Please try again.',
    500,
  )
}

async function mintSession(
  supabaseUrl: string,
  anonKey: string,
  e164: string,
  email: string,
  password: string,
): Promise<{ access_token: string; refresh_token: string } | null> {
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const emailSignIn = await anon.auth.signInWithPassword({
    email,
    password,
  })
  if (emailSignIn.data.session) {
    return {
      access_token: emailSignIn.data.session.access_token,
      refresh_token: emailSignIn.data.session.refresh_token,
    }
  }

  const phoneSignIn = await anon.auth.signInWithPassword({
    phone: e164,
    password,
  })
  if (phoneSignIn.data.session) {
    return {
      access_token: phoneSignIn.data.session.access_token,
      refresh_token: phoneSignIn.data.session.refresh_token,
    }
  }

  console.error(
    'mintSession failed',
    emailSignIn.error?.message,
    phoneSignIn.error?.message,
  )
  return null
}

async function handleVerify(
  admin: AdminClient,
  supabaseUrl: string,
  anonKey: string,
  phoneInput: string,
  codeInput: string,
  fullNameInput?: string,
): Promise<Response> {
  const parsed = parseIndianMobile(phoneInput)
  if (!parsed) {
    return errorResponse('Enter a valid 10-digit Indian mobile number.')
  }

  const code = digitsOnly(codeInput)
  if (!/^\d{6}$/.test(code) || code.length !== OTP_LENGTH) {
    return errorResponse('Enter the 6-digit code sent on WhatsApp.')
  }

  const { data: row, error: loadError } = await admin
    .from('auth_whatsapp_otps')
    .select('id, code_hash, expires_at, attempt_count, max_attempts, consumed_at')
    .eq('phone_e164', parsed.e164)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (loadError) {
    return errorResponse('Unable to verify the code. Please try again.', 500)
  }

  if (!row) {
    return errorResponse('No active code found. Request a new WhatsApp OTP.')
  }

  if (row.consumed_at) {
    return errorResponse('That code was already used. Request a new one.')
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await admin
      .from('auth_whatsapp_otps')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id)
    return errorResponse('That code has expired. Request a new WhatsApp OTP.')
  }

  if ((row.attempt_count ?? 0) >= (row.max_attempts ?? 5)) {
    await admin
      .from('auth_whatsapp_otps')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id)
    return errorResponse('Too many incorrect attempts. Request a new code.')
  }

  const expected = row.code_hash as string
  const actual = await hashPayload(parsed.e164, code)

  if (!timingSafeEqual(expected, actual)) {
    await admin
      .from('auth_whatsapp_otps')
      .update({ attempt_count: (row.attempt_count ?? 0) + 1 })
      .eq('id', row.id)
    return errorResponse('Incorrect code. Check WhatsApp and try again.')
  }

  await admin
    .from('auth_whatsapp_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', row.id)

  const fullName = (fullNameInput ?? '').trim() || 'Customer'
  const password = randomPassword()
  const ensured = await ensureCustomerUser(
    admin,
    parsed.local,
    parsed.e164,
    fullName,
    password,
  )
  if (ensured instanceof Response) return ensured

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', ensured.userId)
    .maybeSingle()

  if (!profile) {
    await admin.from('profiles').insert({
      id: ensured.userId,
      full_name: fullName,
      phone: parsed.local,
      role: 'customer',
    })
  }

  if (ensured.kind === 'magiclink') {
    return jsonResponse({
      ok: true,
      token_hash: ensured.tokenHash,
      type: 'email',
    })
  }

  const session = await mintSession(
    supabaseUrl,
    anonKey,
    parsed.e164,
    ensured.email,
    ensured.password,
  )

  if (!session) {
    return errorResponse(
      'Code verified, but sign-in could not be completed. Please try email login.',
      500,
    )
  }

  return jsonResponse({
    ok: true,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return errorResponse('Server is missing Supabase credentials.', 500)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body.')
  }

  const action = String(body.action ?? '').trim().toLowerCase()
  const phone = String(body.phone ?? '').trim()
  const admin = createClient(supabaseUrl, serviceRoleKey)

  if (action === 'send') {
    return handleSend(admin, phone)
  }

  if (action === 'verify') {
    return handleVerify(
      admin,
      supabaseUrl,
      anonKey,
      phone,
      String(body.code ?? ''),
      typeof body.fullName === 'string' ? body.fullName : undefined,
    )
  }

  return errorResponse('action must be "send" or "verify".')
})
