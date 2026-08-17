// Meta WhatsApp Cloud API helpers for Edge Functions.
// Secrets: none required at module load — per-tenant access tokens live in DB.
//
// Mock mode (no Graph API calls): set WHATSAPP_PROVIDER=mock, or use access
// token "mock" / "mock:…" when connecting a restaurant for local testing.

const GRAPH_API_VERSION = Deno.env.get('WHATSAPP_GRAPH_API_VERSION') ?? 'v21.0'
const GRAPH_BASE =
  Deno.env.get('WHATSAPP_GRAPH_API_BASE') ??
  `https://graph.facebook.com/${GRAPH_API_VERSION}`

/** True when platform or per-tenant credentials request mock sends. */
export function isMockWhatsAppMode(accessToken?: string | null): boolean {
  const provider = (Deno.env.get('WHATSAPP_PROVIDER') ?? '').toLowerCase()
  if (provider === 'mock') return true
  if (!accessToken) return false
  const token = accessToken.trim().toLowerCase()
  return token === 'mock' || token.startsWith('mock:')
}

function mockMessageId(): string {
  return `mock_wa_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
}

export interface SendTemplateInput {
  phoneNumberId: string
  accessToken: string
  toE164: string
  templateName: string
  languageCode: string
  bodyParams: string[]
}

export interface SendTemplateResult {
  ok: boolean
  messageId?: string
  error?: string
  raw?: unknown
}

export interface SendTextInput {
  phoneNumberId: string
  accessToken: string
  toE164: string
  bodyText: string
}

export interface InteractiveButton {
  id: string
  title: string
}

export interface SendButtonsInput {
  phoneNumberId: string
  accessToken: string
  toE164: string
  bodyText: string
  buttons: InteractiveButton[]
  headerText?: string
  footerText?: string
}

export interface InteractiveListRow {
  id: string
  title: string
  description?: string
}

export interface SendListInput {
  phoneNumberId: string
  accessToken: string
  toE164: string
  bodyText: string
  buttonText: string
  sections: Array<{ title?: string; rows: InteractiveListRow[] }>
  headerText?: string
  footerText?: string
}

function digitsOnlyPhone(e164: string): string {
  return e164.replace(/\D/g, '')
}

async function postWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<SendTemplateResult> {
  if (isMockWhatsAppMode(accessToken)) {
    const messageId = mockMessageId()
    const raw = {
      mock: true,
      phone_number_id: phoneNumberId,
      messages: [{ id: messageId }],
      request: body,
    }
    console.log('[whatsapp:mock] outbound', JSON.stringify(raw))
    return { ok: true, messageId, raw }
  }

  const response = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    raw = null
  }

  if (!response.ok) {
    const errObj = raw as { error?: { message?: string } } | null
    return {
      ok: false,
      error: errObj?.error?.message ?? `Meta API error (${response.status})`,
      raw,
    }
  }

  const okBody = raw as { messages?: Array<{ id?: string }> } | null
  const messageId = okBody?.messages?.[0]?.id

  return { ok: true, messageId, raw }
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

export async function sendWhatsAppTemplate(
  input: SendTemplateInput,
): Promise<SendTemplateResult> {
  const to = digitsOnlyPhone(input.toE164)
  if (!to) {
    return { ok: false, error: 'Invalid recipient phone.' }
  }

  const body: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: input.templateName,
      language: { code: input.languageCode || 'en' },
      components:
        input.bodyParams.length > 0
          ? [
              {
                type: 'body',
                parameters: input.bodyParams.map((text) => ({
                  type: 'text',
                  text,
                })),
              },
            ]
          : [],
    },
  }

  return postWhatsAppMessage(input.phoneNumberId, input.accessToken, body)
}

export interface SendAuthenticationOtpInput {
  phoneNumberId: string
  accessToken: string
  toE164: string
  templateName: string
  languageCode: string
  otpCode: string
}

/**
 * Sends a Meta Authentication template (OTP + copy-code / one-tap button).
 * Falls back to a utility-style body-only template if the button component
 * is rejected (custom utility `login_otp` templates).
 */
export async function sendWhatsAppAuthenticationOtp(
  input: SendAuthenticationOtpInput,
): Promise<SendTemplateResult> {
  const to = digitsOnlyPhone(input.toE164)
  if (!to) {
    return { ok: false, error: 'Invalid recipient phone.' }
  }

  const otp = input.otpCode.trim()
  const authBody: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: input.templateName,
      language: { code: input.languageCode || 'en' },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: otp }],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: otp }],
        },
      ],
    },
  }

  const authResult = await postWhatsAppMessage(
    input.phoneNumberId,
    input.accessToken,
    authBody,
  )
  if (authResult.ok) return authResult

  const message = (authResult.error ?? '').toLowerCase()
  const shouldFallback =
    message.includes('button') ||
    message.includes('parameter') ||
    message.includes('component') ||
    message.includes('template')

  if (!shouldFallback) return authResult

  return sendWhatsAppTemplate({
    phoneNumberId: input.phoneNumberId,
    accessToken: input.accessToken,
    toE164: input.toE164,
    templateName: input.templateName,
    languageCode: input.languageCode,
    bodyParams: [otp],
  })
}

export async function sendWhatsAppText(
  input: SendTextInput,
): Promise<SendTemplateResult> {
  const to = digitsOnlyPhone(input.toE164)
  if (!to) {
    return { ok: false, error: 'Invalid recipient phone.' }
  }

  return postWhatsAppMessage(input.phoneNumberId, input.accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { preview_url: false, body: input.bodyText },
  })
}

export async function sendWhatsAppButtons(
  input: SendButtonsInput,
): Promise<SendTemplateResult> {
  const to = digitsOnlyPhone(input.toE164)
  if (!to) {
    return { ok: false, error: 'Invalid recipient phone.' }
  }

  if (input.buttons.length < 1 || input.buttons.length > 3) {
    return { ok: false, error: 'WhatsApp allows 1–3 reply buttons.' }
  }

  const interactive: Record<string, unknown> = {
    type: 'button',
    body: { text: truncate(input.bodyText, 1024) },
    action: {
      buttons: input.buttons.map((btn) => ({
        type: 'reply',
        reply: {
          id: truncate(btn.id, 256),
          title: truncate(btn.title, 20),
        },
      })),
    },
  }

  if (input.headerText) {
    interactive.header = { type: 'text', text: truncate(input.headerText, 60) }
  }
  if (input.footerText) {
    interactive.footer = { text: truncate(input.footerText, 60) }
  }

  return postWhatsAppMessage(input.phoneNumberId, input.accessToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive,
  })
}

export async function sendWhatsAppList(
  input: SendListInput,
): Promise<SendTemplateResult> {
  const to = digitsOnlyPhone(input.toE164)
  if (!to) {
    return { ok: false, error: 'Invalid recipient phone.' }
  }

  const rowCount = input.sections.reduce((n, s) => n + s.rows.length, 0)
  if (rowCount < 1 || rowCount > 10) {
    return { ok: false, error: 'WhatsApp list messages allow 1–10 rows.' }
  }

  const interactive: Record<string, unknown> = {
    type: 'list',
    body: { text: truncate(input.bodyText, 1024) },
    action: {
      button: truncate(input.buttonText, 20),
      sections: input.sections.map((section) => ({
        ...(section.title ? { title: truncate(section.title, 24) } : {}),
        rows: section.rows.map((row) => ({
          id: truncate(row.id, 200),
          title: truncate(row.title, 24),
          ...(row.description
            ? { description: truncate(row.description, 72) }
            : {}),
        })),
      })),
    },
  }

  if (input.headerText) {
    interactive.header = { type: 'text', text: truncate(input.headerText, 60) }
  }
  if (input.footerText) {
    interactive.footer = { text: truncate(input.footerText, 60) }
  }

  return postWhatsAppMessage(input.phoneNumberId, input.accessToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive,
  })
}

export function mapMetaStatusToOutbox(
  status: string,
): 'sent' | 'delivered' | 'read' | 'failed' | null {
  switch (status) {
    case 'sent':
      return 'sent'
    case 'delivered':
      return 'delivered'
    case 'read':
      return 'read'
    case 'failed':
      return 'failed'
    default:
      return null
  }
}

export function normalizeWhatsAppPhone(from: string): string {
  const digits = digitsOnlyPhone(from)
  if (!digits) return from
  return `+${digits}`
}
