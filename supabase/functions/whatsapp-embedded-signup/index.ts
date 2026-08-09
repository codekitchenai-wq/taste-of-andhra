// Embedded Signup callback stub — exchanges Meta code for a long-lived token
// once the platform is registered as a WhatsApp Tech Provider.
//
// Deploy: supabase functions deploy whatsapp-embedded-signup
//
// Required secrets (when Meta app is ready):
//   WHATSAPP_META_APP_ID
//   WHATSAPP_META_APP_SECRET
//   WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID (optional)
//
// Until those are set, this endpoint returns a clear setup message so the
// admin UI can fall back to manual credential connect.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405)
  }

  const authHeader = request.headers.get('Authorization') ?? ''
  if (!authHeader) {
    return errorResponse('Missing authorization header.', 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const appId = Deno.env.get('WHATSAPP_META_APP_ID') ?? ''
  const appSecret = Deno.env.get('WHATSAPP_META_APP_SECRET') ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Server is missing Supabase credentials.', 500)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return errorResponse('Please sign in.', 401)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body.')
  }

  const organizationId = body.organizationId as string | undefined
  const code = body.code as string | undefined

  if (!organizationId) {
    return errorResponse('organizationId is required.')
  }

  if (!appId || !appSecret) {
    return jsonResponse(
      {
        ready: false,
        message:
          'Embedded Signup is not configured yet. Use manual Connect with Phone Number ID and access token, or set WHATSAPP_META_APP_ID and WHATSAPP_META_APP_SECRET.',
      },
      501,
    )
  }

  if (!code) {
    return errorResponse('OAuth code from Embedded Signup is required.')
  }

  // Exchange code → short-lived user token → long-lived token (Tech Provider flow).
  const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('code', code)

  const tokenResponse = await fetch(tokenUrl)
  const tokenJson = (await tokenResponse.json()) as {
    access_token?: string
    error?: { message?: string }
  }

  if (!tokenResponse.ok || !tokenJson.access_token) {
    return errorResponse(
      tokenJson.error?.message ?? 'Unable to exchange Embedded Signup code.',
      502,
    )
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  // Persist pending connection; WABA / phone IDs arrive via signup extras or
  // a follow-up Graph call once the partner integration is complete.
  const wabaId = (body.wabaId as string | undefined) ?? null
  const phoneNumberId = (body.phoneNumberId as string | undefined) ?? null
  const displayPhoneNumber =
    (body.displayPhoneNumber as string | undefined) ?? null

  const { data, error } = await admin
    .from('organization_whatsapp_configs')
    .upsert(
      {
        organization_id: organizationId,
        provider: 'meta_cloud',
        access_token: tokenJson.access_token,
        token_configured: true,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        display_phone_number: displayPhoneNumber,
        connection_status:
          wabaId && phoneNumberId ? 'connected' : 'pending_review',
        connected_at:
          wabaId && phoneNumberId ? new Date().toISOString() : null,
        last_error: null,
      },
      { onConflict: 'organization_id' },
    )
    .select(
      'id, organization_id, provider, connection_status, waba_id, phone_number_id, display_phone_number, token_configured, connected_at',
    )
    .single()

  if (error) {
    return errorResponse(error.message)
  }

  return jsonResponse({ ready: true, config: data })
})
