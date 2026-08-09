// Meta WhatsApp webhook: verification, delivery receipts, STOP opt-out,
// and conversational welcome/menu routing (Phase 2).
//
// Deploy with JWT verification off (Meta cannot send a Supabase JWT):
//   supabase functions deploy whatsapp-webhook --no-verify-jwt
//
// Set WHATSAPP_WEBHOOK_VERIFY_TOKEN as a platform fallback; per-org tokens
// on organization_whatsapp_configs.webhook_verify_token are also accepted.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  mapMetaStatusToOutbox,
  normalizeWhatsAppPhone,
  sendWhatsAppText,
} from '../_shared/whatsapp.ts'
import {
  handleConversationMessage,
  isOptOutText,
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const platformVerify =
    Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Server is missing Supabase credentials.', 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  // Meta webhook verification (GET)
  if (request.method === 'GET') {
    const url = new URL(request.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode !== 'subscribe' || !token || !challenge) {
      return errorResponse('Invalid verification request.', 400)
    }

    if (platformVerify && token === platformVerify) {
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    const { data: match } = await admin
      .from('organization_whatsapp_configs')
      .select('id')
      .eq('webhook_verify_token', token)
      .limit(1)
      .maybeSingle()

    if (match) {
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    return errorResponse('Verification token mismatch.', 403)
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405)
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return errorResponse('Invalid JSON body.')
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : []

  for (const entry of entries) {
    const changes = Array.isArray((entry as { changes?: unknown }).changes)
      ? ((entry as { changes: unknown[] }).changes)
      : []

    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> }).value
      if (!value) continue

      const metadata = value.metadata as
        | { phone_number_id?: string }
        | undefined
      const phoneNumberId = metadata?.phone_number_id

      let organizationId: string | null = null
      let accessToken: string | null = null
      let restaurantName = 'our restaurant'
      let configPhoneNumberId: string | null = phoneNumberId ?? null

      if (phoneNumberId) {
        const { data: config } = await admin
          .from('organization_whatsapp_configs')
          .select('organization_id, access_token, phone_number_id, connection_status')
          .eq('phone_number_id', phoneNumberId)
          .maybeSingle()

        organizationId = (config?.organization_id as string) ?? null
        accessToken = (config?.access_token as string) ?? null
        configPhoneNumberId =
          (config?.phone_number_id as string) ?? phoneNumberId

        if (organizationId) {
          const { data: org } = await admin
            .from('organizations')
            .select('name')
            .eq('id', organizationId)
            .maybeSingle()
          if (org?.name) restaurantName = String(org.name)
        }
      }

      const statuses = Array.isArray(value.statuses) ? value.statuses : []
      for (const statusEvent of statuses) {
        const event = statusEvent as {
          id?: string
          status?: string
          errors?: Array<{ message?: string }>
        }
        const wamid = event.id
        const mapped = event.status
          ? mapMetaStatusToOutbox(event.status)
          : null
        if (!wamid || !mapped) continue

        const { data: outbox } = await admin
          .from('whatsapp_message_outbox')
          .select('id, notification_id')
          .eq('provider_message_id', wamid)
          .maybeSingle()

        if (!outbox) continue

        const lastError =
          mapped === 'failed'
            ? event.errors?.[0]?.message ?? 'Provider reported failure'
            : null

        await admin
          .from('whatsapp_message_outbox')
          .update({
            status: mapped,
            last_error: lastError,
          })
          .eq('id', outbox.id)

        if (outbox.notification_id) {
          await admin
            .from('notifications')
            .update({
              metadata: {
                external_status: mapped,
                wamid,
                note:
                  mapped === 'failed'
                    ? lastError
                    : `WhatsApp ${mapped}`,
              },
            })
            .eq('id', outbox.notification_id)
        }
      }

      const messages = Array.isArray(value.messages) ? value.messages : []
      for (const message of messages) {
        const inbound = parseInboundMessage(
          message as Record<string, unknown>,
        )
        if (!inbound || !organizationId) continue

        // Idempotency: skip already-processed Meta message ids
        const { error: insertError } = await admin
          .from('whatsapp_inbound_events')
          .insert({
            organization_id: organizationId,
            provider_message_id: inbound.messageId,
            phone_e164: normalizeWhatsAppPhone(inbound.from),
            message_type: inbound.type,
            payload: {
              text: inbound.text,
              interactive_id: inbound.interactiveId,
            },
          })

        if (insertError) {
          // Unique violation → already handled
          if (
            insertError.code === '23505' ||
            insertError.message.toLowerCase().includes('duplicate')
          ) {
            continue
          }
          console.error('inbound event insert failed', insertError.message)
        }

        if (isOptOutText(inbound.text)) {
          const phone = normalizeWhatsAppPhone(inbound.from)
          await admin.from('whatsapp_opt_outs').upsert(
            {
              organization_id: organizationId,
              phone_e164: phone,
              source: 'user_stop',
              opted_out_at: new Date().toISOString(),
            },
            { onConflict: 'organization_id,phone_e164' },
          )

          if (accessToken && configPhoneNumberId) {
            await sendWhatsAppText({
              phoneNumberId: configPhoneNumberId,
              accessToken,
              toE164: phone,
              bodyText:
                'You have been unsubscribed from WhatsApp order updates. Reply MENU if you still want to browse our menu.',
            })
          }
          continue
        }

        const { data: orderingEnabled } = await admin.rpc('has_feature', {
          target_org_id: organizationId,
          feature_key: 'whatsapp_ordering',
        })

        if (!orderingEnabled) continue
        if (!accessToken || !configPhoneNumberId) continue

        const result = await handleConversationMessage(
          admin,
          {
            organizationId,
            phoneNumberId: configPhoneNumberId,
            accessToken,
            restaurantName,
            storefrontUrl: resolveStorefrontUrl(),
          },
          inbound,
        )

        if (result.error) {
          console.error('conversation handler error', result.error)
        }
        if (result.send && !result.send.ok) {
          console.error('conversation send failed', result.send.error)
          await admin
            .from('organization_whatsapp_configs')
            .update({ last_error: result.send.error ?? 'Send failed' })
            .eq('organization_id', organizationId)
        }
      }
    }
  }

  // Meta expects a quick 200.
  return jsonResponse({ received: true })
})
