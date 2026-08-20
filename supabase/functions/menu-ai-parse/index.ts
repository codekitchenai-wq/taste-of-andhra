import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'

/**
 * Parse menu photos/PDF URLs into MenuCsvRow-shaped JSON.
 * Requires OPENAI_API_KEY. Without it, returns a clear error so UI can fall back to CSV.
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
  const apiKey = Deno.env.get('OPENAI_API_KEY') ?? ''

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

  if (!apiKey) {
    return jsonResponse({
      error:
        'OPENAI_API_KEY not configured. Use CSV upload or enter menu items manually.',
      rows: [],
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: `Extract menu items from these restaurant menu images/PDFs.
Return JSON: { "rows": [ { "category", "name", "price", "isVeg", "description" } ] }.
Rules:
- Do not invent prices; skip items without a clear price.
- isVeg true/false only when identifiable; default true if unclear vegetarian-looking name, else false for meat/fish.
- Group into sensible categories.
- Max 30 items.
- Prefer Indian restaurant menu conventions.`,
    },
  ]

  for (const url of sourcePaths.slice(0, 6)) {
    userContent.push({
      type: 'image_url',
      image_url: { url },
    })
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
            content: 'You extract restaurant menus into structured JSON.',
          },
          { role: 'user', content: userContent },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      if (jobId) {
        await admin
          .from('menu_import_jobs')
          .update({
            status: 'failed',
            error: detail.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
      }
      return errorResponse(`OpenAI error: ${detail.slice(0, 300)}`, 502)
    }

    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    const parsed = typeof content === 'string' ? JSON.parse(content) : {}
    const rawRows = Array.isArray(parsed.rows) ? parsed.rows : []

    const rows: DraftRow[] = []
    for (const [index, raw] of rawRows.entries()) {
      const name = String(raw?.name ?? '').trim()
      const category = String(raw?.category ?? 'Menu').trim() || 'Menu'
      const price = Number(raw?.price)
      if (!name || !Number.isFinite(price) || price < 0) continue
      rows.push({
        category,
        name,
        price,
        isVeg: Boolean(raw?.isVeg),
        spiceLevel: null,
        description: String(raw?.description ?? '').trim(),
        preparationTimeMinutes: null,
        isAvailable: true,
        isFeatured: false,
        displayOrder: index + 1,
        lineNumber: index + 1,
      })
    }

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
