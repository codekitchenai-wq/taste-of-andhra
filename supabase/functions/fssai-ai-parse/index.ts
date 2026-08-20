import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  fetchUrlAsInlineData,
  geminiApiKey,
  geminiGenerateJson,
  parseDataUrl,
  type GeminiPart,
} from '../_shared/gemini.ts'

/**
 * Parse FSSAI certificate fields via Gemini Flash (preferred) or OpenAI.
 *
 * Deploy: supabase functions deploy fssai-ai-parse
 * Secrets: GEMINI_API_KEY (preferred) or OPENAI_API_KEY
 */

function emptyExtract(note?: string) {
  return {
    legalName: null,
    fssaiLicense: null,
    fssaiValidUntil: null,
    address: null,
    city: null,
    state: null,
    pincode: null,
    proprietorName: null,
    phone: null,
    email: null,
    kindOfBusiness: null,
    issuedOn: null,
    note: note ?? null,
  }
}

/** Normalize DD-MM-YYYY / DD/MM/YYYY → YYYY-MM-DD when unambiguous. */
function normalizeDate(value: unknown): string | null {
  if (value == null) return null
  const raw = String(value).trim()
  if (!raw) return null
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
  if (dmy) {
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    return `${dmy[3]}-${month}-${day}`
  }
  return raw.slice(0, 10)
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s ? s : null
}

function mapExtract(parsed: Record<string, unknown>) {
  return {
    legalName: asNullableString(
      parsed.legalName ?? parsed.legal_name ?? parsed.firmName,
    ),
    fssaiLicense: asNullableString(
      parsed.fssaiLicense ??
        parsed.fssai_license ??
        parsed.registrationNumber ??
        parsed.registration_number,
    ),
    fssaiValidUntil: normalizeDate(
      parsed.fssaiValidUntil ??
        parsed.fssai_valid_until ??
        parsed.validUpto ??
        parsed.valid_upto,
    ),
    issuedOn: normalizeDate(parsed.issuedOn ?? parsed.issued_on),
    address: asNullableString(parsed.address ?? parsed.premisesAddress),
    city: asNullableString(parsed.city ?? parsed.place),
    state: asNullableString(parsed.state),
    pincode: asNullableString(parsed.pincode ?? parsed.pin),
    proprietorName: asNullableString(
      parsed.proprietorName ??
        parsed.proprietor_name ??
        parsed.ownerName ??
        parsed.fboPersonName,
    ),
    phone: asNullableString(parsed.phone ?? parsed.mobile),
    email: asNullableString(parsed.email),
    kindOfBusiness: asNullableString(
      parsed.kindOfBusiness ??
        parsed.kind_of_business ??
        parsed.businessType,
    ),
  }
}

const FSSAI_PROMPT = `Extract Indian FSSAI Registration / Licence certificate fields as JSON.
Use null when not visible — never invent.

Typical FoSCoS / state Registration Certificate layout:
- Top: "Registration Number" (often 14 digits) near a QR code — that is fssaiLicense.
- Field 1 "Name and permanent address of Food Business Operator (FBO)":
  - First line / firm name = legalName (e.g. BLACK HEAVEN CAFE).
  - Remaining lines = address. If a person name appears before street/area (e.g. RAHIL SHEIKH, …), use that as proprietorName.
- Field 2 "Address of location where food business is to be conducted" = premises address (prefer this for address when present).
- Field 3 "Kind of Business" = kindOfBusiness (full text, e.g. Petty Retailer of snacks/tea shops).
- "Valid Upto" / Registration Validity = fssaiValidUntil.
- "Issued On" = issuedOn.
- "Place" under validity often = city.
- Address often ends with "State-PIN" e.g. Rajasthan-312001 → state + pincode.

Keys:
- legalName: business / firm name only (not the whole address block)
- fssaiLicense: registration / licence number digits
- fssaiValidUntil: YYYY-MM-DD (convert from DD-MM-YYYY if needed)
- issuedOn: YYYY-MM-DD if present
- address: full premises / FBO address string
- city: city / district / Place if identifiable
- state: Indian state if identifiable
- pincode: 6-digit PIN
- proprietorName: proprietor / FBO person name if printed (not the firm name)
- phone: phone if printed
- email: email if printed
- kindOfBusiness: Kind of Business text if printed
Return only JSON.`

async function parseWithGemini(input: {
  imageUrl?: string
  rawText?: string
}): Promise<Record<string, unknown>> {
  const parts: GeminiPart[] = [{ text: FSSAI_PROMPT }]
  if (input.rawText) {
    parts.push({ text: input.rawText.slice(0, 8000) })
  }
  if (input.imageUrl) {
    if (input.imageUrl.startsWith('data:')) {
      const inline = parseDataUrl(input.imageUrl)
      if (inline) {
        parts.push({
          inline_data: {
            mime_type: inline.mime_type,
            data: inline.data,
          },
        })
      }
    } else if (input.imageUrl.startsWith('http')) {
      const inline = await fetchUrlAsInlineData(input.imageUrl)
      if (inline) {
        parts.push({
          inline_data: {
            mime_type: inline.mime_type,
            data: inline.data,
          },
        })
      }
    }
  }

  const result = await geminiGenerateJson(parts)
  if (!result.ok) throw new Error(result.error)
  return (result.json ?? {}) as Record<string, unknown>
}

async function parseWithOpenAi(input: {
  apiKey: string
  imageUrl?: string
  rawText?: string
}): Promise<Record<string, unknown>> {
  const userContent: Array<Record<string, unknown>> = [
    { type: 'text', text: FSSAI_PROMPT },
  ]
  if (input.rawText) {
    userContent.push({ type: 'text', text: input.rawText.slice(0, 8000) })
  }
  if (input.imageUrl) {
    userContent.push({
      type: 'image_url',
      image_url: { url: input.imageUrl, detail: 'low' },
    })
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_VISION_MODEL') || 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You extract Indian FSSAI registration/licence certificate data. Prefer FoSCoS field labels. Return only JSON. Never invent values.',
        },
        { role: 'user', content: userContent },
      ],
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`OpenAI error: ${detail.slice(0, 300)}`)
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  return typeof content === 'string' ? JSON.parse(content) : {}
}

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
  const certificateDataUrl = String(body.certificateDataUrl ?? '').trim()
  const rawText = String(body.rawText ?? '').trim()
  const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? ''
  const hasGemini = Boolean(geminiApiKey())

  if (!hasGemini && !openaiKey) {
    return jsonResponse(
      emptyExtract(
        'GEMINI_API_KEY not configured — enter FSSAI fields manually.',
      ),
    )
  }

  const imageUrl =
    certificateDataUrl.startsWith('data:image/')
      ? certificateDataUrl
      : certificateUrl.startsWith('http')
        ? certificateUrl
        : certificateUrl.startsWith('data:image/')
          ? certificateUrl
          : ''

  if (!rawText && !imageUrl) {
    return errorResponse(
      'Provide an image (upload) or https certificate URL. Local file paths are not supported.',
    )
  }

  try {
    const parsed = hasGemini
      ? await parseWithGemini({ imageUrl: imageUrl || undefined, rawText })
      : await parseWithOpenAi({
          apiKey: openaiKey,
          imageUrl: imageUrl || undefined,
          rawText,
        })

    return jsonResponse(mapExtract(parsed))
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'FSSAI parse failed.',
      500,
    )
  }
})
