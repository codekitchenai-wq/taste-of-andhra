// WhatsApp dispatch — compatibility entrypoint.
// Delegates processing to the provider-agnostic outbox processor.
// Prefer communication-dispatch for new callers.
//
// Deploy: supabase functions deploy whatsapp-dispatch

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { processOutboxRow } from '../_shared/providers/dispatchOutbox.ts'

type DispatchBody = {
  mode?: 'drain' | 'test' | 'single'
  outboxId?: string
  organizationId?: string
  recipientPhone?: string
}

function normalizeToE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  if (digits.length === 10) return `+91${digits}`
  if (phone.trim().startsWith('+') && digits.length >= 10) return `+${digits}`
  return null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405)
  }

  const authHeader = request.headers.get('Authorization') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Server is missing Supabase credentials.', 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  let body: DispatchBody = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const mode = body.mode ?? (body.outboxId ? 'single' : 'drain')

  let callerUserId: string | null = null

  if (authHeader) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
    } = await userClient.auth.getUser()
    callerUserId = user?.id ?? null
  }

  const requireAdmin = async (): Promise<Response | null> => {
    if (!callerUserId) {
      return errorResponse('Please sign in.', 401)
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', callerUserId)
      .maybeSingle()

    const isAdmin =
      profile?.role === 'admin' || profile?.role === 'platform_master'

    if (isAdmin) return null

    const { data: membership } = await admin
      .from('organization_members')
      .select('id')
      .eq('user_id', callerUserId)
      .eq('is_active', true)
      .in('role', ['restaurant_owner', 'restaurant_admin'])
      .limit(1)
      .maybeSingle()

    if (!membership) {
      return errorResponse('Only admins can dispatch WhatsApp messages.', 403)
    }

    return null
  }

  if (mode === 'test' || mode === 'drain') {
    const denied = await requireAdmin()
    if (denied) return denied
  }

  if (mode === 'single' && body.outboxId) {
    if (!callerUserId) {
      return errorResponse('Please sign in.', 401)
    }

    const { data: row } = await admin
      .from('whatsapp_message_outbox')
      .select('user_id, status')
      .eq('id', body.outboxId)
      .maybeSingle()

    if (!row) {
      return errorResponse('Outbox row not found.', 404)
    }

    const isOwner = row.user_id === callerUserId
    if (!isOwner) {
      const denied = await requireAdmin()
      if (denied) return denied
    }
  }

  if (mode === 'test') {
    const organizationId = body.organizationId
    const recipientPhone = body.recipientPhone
      ? normalizeToE164(body.recipientPhone)
      : null

    if (!organizationId || !recipientPhone) {
      return errorResponse(
        'organizationId and recipientPhone are required for test mode.',
      )
    }

    const { data: settings } = await admin
      .from('communication_settings')
      .select('whatsapp_provider')
      .eq('organization_id', organizationId)
      .maybeSingle()

    const provider =
      (settings?.whatsapp_provider as string) ||
      Deno.env.get('WHATSAPP_PROVIDER') ||
      'meta_cloud'

    let templateName = 'order_confirmed'
    if (provider === 'meta_cloud') {
      const { data: config } = await admin
        .from('organization_whatsapp_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle()

      if (!config?.access_token || !config.phone_number_id) {
        return errorResponse(
          'WhatsApp is not connected. Save Phone Number ID and access token first.',
          422,
        )
      }

      templateName =
        (config.template_map as Record<string, { name?: string }>)?.confirmed
          ?.name ?? 'order_confirmed'
    }

    const idempotencyKey = `test:${organizationId}:${Date.now()}`
    const { data: outbox, error: insertError } = await admin
      .from('whatsapp_message_outbox')
      .insert({
        organization_id: organizationId,
        channel: 'whatsapp',
        provider,
        order_status: 'confirmed',
        event_type: 'ORDER_CONFIRMED',
        recipient_phone: recipientPhone,
        template_name: templateName,
        template_language: 'en',
        template_params: ['Test Restaurant', 'TEST-001'],
        idempotency_key: idempotencyKey,
        status: 'queued',
        metadata: { test: true },
      })
      .select('id')
      .single()

    if (insertError || !outbox) {
      return errorResponse(
        insertError?.message ?? 'Unable to create test outbox row.',
      )
    }

    const result = await processOutboxRow(admin, outbox.id as string)
    if (!result.ok) {
      return errorResponse(result.error ?? 'Test send failed.', 502)
    }

    return jsonResponse({ outboxId: outbox.id, messageId: result.messageId })
  }

  const ids: string[] = []

  if (mode === 'single' && body.outboxId) {
    ids.push(body.outboxId)
  } else {
    let query = admin
      .from('whatsapp_message_outbox')
      .select('id')
      .eq('status', 'queued')
      .eq('channel', 'whatsapp')
      .order('created_at', { ascending: true })
      .limit(25)

    if (body.organizationId) {
      query = query.eq('organization_id', body.organizationId)
    }

    const { data: rows } = await query
    for (const row of rows ?? []) {
      ids.push(row.id as string)
    }
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = []

  for (const id of ids) {
    const result = await processOutboxRow(admin, id)
    results.push({ id, ok: result.ok, error: result.error })
  }

  return jsonResponse({ processed: results.length, results })
})
