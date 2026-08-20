import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'

/**
 * Parse FSSAI certificate fields via OpenAI when OPENAI_API_KEY is set.
 * Falls back to empty extraction so Master can fill manually.
 *
 * Deploy: supabase functions deploy fssai-ai-parse
 * Body: { certificateUrl?: string, rawText?: string }
 */

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid request body.')
  }

  const certificateUrl = String(body.certificateUrl ?? '').trim()
  const rawText = String(body.rawText ?? '').trim()
  const apiKey = Deno.env.get('OPENAI_API_KEY') ?? ''

  if (!apiKey) {
    return jsonResponse({
      legalName: null,
      fssaiLicense: null,
      fssaiValidUntil: null,
      address: null,
      note: 'OPENAI_API_KEY not configured — enter FSSAI fields manually.',
    })
  }

  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text:
        'Extract FSSAI licence fields as JSON with keys legalName, fssaiLicense, fssaiValidUntil (YYYY-MM-DD), address. Use null when unknown. Do not invent values.',
    },
  ]
  if (rawText) {
    userContent.push({ type: 'text', text: rawText.slice(0, 8000) })
  }
  if (certificateUrl) {
    userContent.push({
      type: 'image_url',
      image_url: { url: certificateUrl },
    })
  }

  if (!rawText && !certificateUrl) {
    return errorResponse('Provide certificateUrl or rawText.')
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_VISION_MODEL') || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You extract Indian FSSAI licence data. Return only JSON.',
          },
          { role: 'user', content: userContent },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return errorResponse(`OpenAI error: ${detail.slice(0, 300)}`, 502)
    }

    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    const parsed = typeof content === 'string' ? JSON.parse(content) : {}

    return jsonResponse({
      legalName: parsed.legalName ?? parsed.legal_name ?? null,
      fssaiLicense: parsed.fssaiLicense ?? parsed.fssai_license ?? null,
      fssaiValidUntil:
        parsed.fssaiValidUntil ?? parsed.fssai_valid_until ?? null,
      address: parsed.address ?? null,
    })
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'FSSAI parse failed.',
      500,
    )
  }
})
