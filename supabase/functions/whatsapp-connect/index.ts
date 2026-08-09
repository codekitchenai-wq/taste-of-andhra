// Stores or clears per-org WhatsApp credentials (access token never round-trips
// through a client SELECT of the configs table).
//
// Deploy: supabase functions deploy whatsapp-connect
//
// Body (connect):
//   { organizationId, provider, wabaId, phoneNumberId, displayPhoneNumber,
//     accessToken, webhookVerifyToken? }
// Body (disconnect):
//   { organizationId, action: "disconnect" }

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'

const SAFE_COLUMNS =
  'id, organization_id, provider, connection_status, waba_id, phone_number_id, display_phone_number, token_configured, webhook_verify_token, enabled_statuses, template_map, last_error, connected_at, created_at, updated_at'

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

  const admin = createClient(supabaseUrl, serviceRoleKey)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body.')
  }

  const organizationId = body.organizationId as string | undefined
  if (!organizationId) {
    return errorResponse('organizationId is required.')
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isPlatformMaster = profile?.role === 'platform_master'
  const isLegacyAdmin = profile?.role === 'admin'

  if (!isPlatformMaster && !isLegacyAdmin) {
    const { data: membership } = await admin
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('role', ['restaurant_owner', 'restaurant_admin'])
      .maybeSingle()

    if (!membership) {
      return errorResponse('Only restaurant admins can manage WhatsApp.', 403)
    }
  }

  if (body.action === 'disconnect') {
    const { data, error } = await admin
      .from('organization_whatsapp_configs')
      .upsert(
        {
          organization_id: organizationId,
          connection_status: 'disconnected',
          access_token: null,
          token_configured: false,
          waba_id: null,
          phone_number_id: null,
          display_phone_number: null,
          last_error: null,
          connected_at: null,
        },
        { onConflict: 'organization_id' },
      )
      .select(SAFE_COLUMNS)
      .single()

    if (error) {
      return errorResponse(error.message)
    }

    return jsonResponse({ config: data })
  }

  const provider = (body.provider as string) || 'meta_cloud'
  const wabaId = String(body.wabaId ?? '').trim()
  const phoneNumberId = String(body.phoneNumberId ?? '').trim()
  const displayPhoneNumber = String(body.displayPhoneNumber ?? '').trim()
  const accessToken = String(body.accessToken ?? '').trim()
  const webhookVerifyToken =
    typeof body.webhookVerifyToken === 'string'
      ? body.webhookVerifyToken.trim()
      : null

  if (!wabaId || !phoneNumberId || !displayPhoneNumber || !accessToken) {
    return errorResponse(
      'wabaId, phoneNumberId, displayPhoneNumber, and accessToken are required.',
    )
  }

  const { data, error } = await admin
    .from('organization_whatsapp_configs')
    .upsert(
      {
        organization_id: organizationId,
        provider,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        display_phone_number: displayPhoneNumber,
        access_token: accessToken,
        token_configured: true,
        webhook_verify_token: webhookVerifyToken,
        connection_status: 'connected',
        connected_at: new Date().toISOString(),
        last_error: null,
      },
      { onConflict: 'organization_id' },
    )
    .select(SAFE_COLUMNS)
    .single()

  if (error) {
    return errorResponse(error.message)
  }

  return jsonResponse({ config: data })
})
