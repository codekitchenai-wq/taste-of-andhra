import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import {
  fetchUrlAsInlineData,
  geminiApiKey,
  geminiGenerateJson,
  type GeminiPart,
} from '../_shared/gemini.ts'

/**
 * Parse menu photos/PDF URLs into MenuCsvRow-shaped JSON.
 * Prefers free Gemini Flash (GEMINI_API_KEY); falls back to OpenAI if set.
 *
 * Deploy: supabase functions deploy menu-ai-parse
 * Body: { organizationId, sourcePaths: string[], jobId?: string }
 */

type DraftRow = {
  category: string
  name: string
  price: number
  isVeg: boolean
  spiceLevel: string | null
  description: string
  preparationTimeMinutes: number | null
  isAvailable: boolean
  isFeatured: boolean
  displayOrder: number
  lineNumber: number
}

const MENU_PROMPT = `Extract ALL visible menu items from these restaurant menu images/PDFs.
Return JSON: { "rows": [ { "category", "name", "price", "isVeg", "description" } ] }.
Rules:
- Extract every priced item you can read (do not silently drop items to fit a limit).
- Do not invent prices; skip items without a clear price.
- isVeg true/false only when identifiable; default true if unclear vegetarian-looking name, else false for meat/fish/egg.
- Group into sensible categories from the menu headings when present.
- description: short dish description if printed; otherwise empty string.
- Prefer Indian restaurant menu conventions.
- Return only JSON.`

function normalizeRows(rawRows: unknown[]): DraftRow[] {
  const rows: DraftRow[] = []
  for (const [index, raw] of rawRows.entries()) {
    const item = raw as Record<string, unknown>
    const name = String(item?.name ?? '').trim()
    const category = String(item?.category ?? 'Menu').trim() || 'Menu'
    const price = Number(item?.price)
    if (!name || !Number.isFinite(price) || price < 0) continue
    rows.push({
      category,
      name,
      price,
      isVeg: Boolean(item?.isVeg),
      spiceLevel: null,
      description: String(item?.description ?? '').trim(),
      preparationTimeMinutes: null,
      isAvailable: true,
      isFeatured: false,
      displayOrder: index + 1,
      lineNumber: index + 1,
    })
  }
  return rows
}

async function parseWithGemini(sourcePaths: string[]): Promise<DraftRow[]> {
  const parts: GeminiPart[] = [{ text: MENU_PROMPT }]
  for (const url of sourcePaths.slice(0, 6)) {
    const inline = await fetchUrlAsInlineData(url)
    if (!inline) continue
    parts.push({
      inline_data: {
        mime_type: inline.mime_type,
        data: inline.data,
      },
    })
  }
  if (parts.length < 2) {
    throw new Error('Could not load menu images for Gemini.')
  }
  const result = await geminiGenerateJson(parts)
  if (!result.ok) throw new Error(result.error)
  const parsed = result.json as { rows?: unknown[] }
  return normalizeRows(Array.isArray(parsed.rows) ? parsed.rows : [])
}

async function parseWithOpenAi(
  apiKey: string,
  sourcePaths: string[],
): Promise<DraftRow[]> {
  const userContent: Array<Record<string, unknown>> = [
    { type: 'text', text: MENU_PROMPT },
  ]
  for (const url of sourcePaths.slice(0, 6)) {
    userContent.push({
      type: 'image_url',
      image_url: { url },
    })
  }

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
          content: 'You extract restaurant menus into structured JSON.',
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
  const parsed = typeof content === 'string' ? JSON.parse(content) : {}
  return normalizeRows(Array.isArray(parsed.rows) ? parsed.rows : [])
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
  const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? ''
  const hasGemini = Boolean(geminiApiKey())

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

  const organizationId = String(body.organizationId ?? '').trim()
  const sourcePaths = Array.isArray(body.sourcePaths)
    ? body.sourcePaths.map((p) => String(p)).filter(Boolean)
    : []
  const jobId = String(body.jobId ?? '').trim() || null

  if (!organizationId || sourcePaths.length === 0) {
    return errorResponse('organizationId and sourcePaths are required.')
  }

  if (!hasGemini && !openaiKey) {
    return jsonResponse({
      error:
        'GEMINI_API_KEY not configured. Use CSV upload or enter menu items manually.',
      rows: [],
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  try {
    const rows = hasGemini
      ? await parseWithGemini(sourcePaths)
      : await parseWithOpenAi(openaiKey, sourcePaths)

    if (jobId) {
      await admin
        .from('menu_import_jobs')
        .update({
          status: rows.length ? 'ready' : 'failed',
          draft_rows: rows,
          error: rows.length ? null : 'No items extracted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }

    return jsonResponse({ rows, organizationId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Menu parse failed.'
    if (jobId) {
      await admin
        .from('menu_import_jobs')
        .update({
          status: 'failed',
          error: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }
    return errorResponse(message, 500)
  }
})
