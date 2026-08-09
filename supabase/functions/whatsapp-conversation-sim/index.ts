// Simulate inbound WhatsApp conversation without Meta (admin / platform master).
// Uses mock sends when access token is "mock" or WHATSAPP_PROVIDER=mock.
//
// Deploy: supabase functions deploy whatsapp-conversation-sim
//
// Body:
//   {
//     organizationId: string,
//     from: string,              // E.164 or digits, e.g. +919876543210
//     text?: string,             // free text ("hi", "menu", "help")
//     interactiveId?: string,    // e.g. act:view_menu | cat:<uuid> | dish:<uuid>
//     messageId?: string         // optional; auto-generated when omitted
//   }
//
// Response includes conversation send result (mock payloads under send.raw).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { normalizeWhatsAppPhone } from '../_shared/whatsapp.ts'
import {
  handleConversationMessage,
  parseInboundMessage,
} from '../_shared/whatsapp_conversation.ts'

function resolveStorefrontUrl(): string | null {
  const base = (
    Deno.env.get('PUBLIC_STOREFRONT_URL') ??
    Deno.env.get('SITE_URL') ??
    ''
  ).trim()
  if (!base) return null
  return `${base.replace(/\/$/, '')}/menu`
}

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

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isPlatformMaster = profile?.role === 'platform_master'
  const isLegacyAdmin = profile?.role === 'admin'

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body.')
  }

  const organizationId = body.organizationId as string | undefined
  const from = typeof body.from === 'string' ? body.from.trim() : ''
  const text = typeof body.text === 'string' ? body.text : null
  const interactiveId =
    typeof body.interactiveId === 'string' ? body.interactiveId : null
  const messageId =
    typeof body.messageId === 'string' && body.messageId.trim()
      ? body.messageId.trim()
      : `sim_${crypto.randomUUID()}`

  if (!organizationId) {
    return errorResponse('organizationId is required.')
  }
  if (!from) {
    return errorResponse('from (customer phone) is required.')
  }
  if (!text && !interactiveId) {
    return errorResponse('Provide text and/or interactiveId.')
  }

  if (!isPlatformMaster && !isLegacyAdmin) {
    const { data: membership } = await admin
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!membership) {
      return errorResponse('Not allowed for this organization.', 403)
    }
  }

  const { data: orderingEnabled } = await admin.rpc('has_feature', {
    target_org_id: organizationId,
    feature_key: 'whatsapp_ordering',
  })

  if (!orderingEnabled) {
    return errorResponse(
      'whatsapp_ordering is not enabled for this organization.',
      403,
    )
  }

  const { data: config } = await admin
    .from('organization_whatsapp_configs')
    .select('phone_number_id, access_token, connection_status')
    .eq('organization_id', organizationId)
    .maybeSingle()

  const accessToken = (config?.access_token as string | null) ?? 'mock'
  const phoneNumberId =
    (config?.phone_number_id as string | null) ?? 'mock_phone_number_id'

  const { data: org } = await admin
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .maybeSingle()

  const restaurantName = org?.name ? String(org.name) : 'our restaurant'

  const syntheticMessage: Record<string, unknown> = {
    id: messageId,
    from: from.replace(/\D/g, '') || from,
    type: interactiveId ? 'interactive' : 'text',
  }

  if (interactiveId) {
    syntheticMessage.interactive = {
      type: interactiveId.startsWith('cat:') ||
          interactiveId.startsWith('dish:') ||
          interactiveId.startsWith('catpage:') ||
          interactiveId.startsWith('dishpage:')
        ? 'list_reply'
        : 'button_reply',
      button_reply: { id: interactiveId, title: text ?? interactiveId },
      list_reply: { id: interactiveId, title: text ?? interactiveId },
    }
  } else {
    syntheticMessage.text = { body: text }
  }

  const inbound = parseInboundMessage(syntheticMessage)
  if (!inbound) {
    return errorResponse('Could not parse simulated inbound message.')
  }

  // Record for observability / idempotency (unique per messageId)
  await admin.from('whatsapp_inbound_events').upsert(
    {
      organization_id: organizationId,
      provider_message_id: inbound.messageId,
      phone_e164: normalizeWhatsAppPhone(inbound.from),
      message_type: inbound.type,
      payload: {
        text: inbound.text,
        interactive_id: inbound.interactiveId,
        simulated: true,
      },
    },
    { onConflict: 'provider_message_id' },
  )

  const result = await handleConversationMessage(
    admin,
    {
      organizationId,
      phoneNumberId,
      accessToken,
      restaurantName,
      storefrontUrl: resolveStorefrontUrl(),
    },
    inbound,
  )

  const { data: session } = await admin
    .from('conversation_sessions')
    .select('id, current_state, context_json, expires_at')
    .eq('organization_id', organizationId)
    .eq('phone_e164', normalizeWhatsAppPhone(inbound.from))
    .maybeSingle()

  return jsonResponse({
    ok: !result.error && (result.send?.ok ?? true),
    inbound,
    send: result.send ?? null,
    error: result.error ?? null,
    session,
  })
})
