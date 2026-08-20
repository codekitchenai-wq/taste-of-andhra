/**
 * Gemini Flash helpers for Website Starter vision extract (FSSAI + menu).
 * Secret: GEMINI_API_KEY
 * Optional: GEMINI_VISION_MODEL (default gemini-2.5-flash)
 */

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }

export function geminiApiKey(): string {
  return (Deno.env.get('GEMINI_API_KEY') ?? '').trim()
}

export function geminiModel(): string {
  return (
    Deno.env.get('GEMINI_VISION_MODEL')?.trim() || 'gemini-2.5-flash'
  )
}

export function parseDataUrl(
  dataUrl: string,
): { mime_type: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s)
  if (!match) return null
  return { mime_type: match[1], data: match[2] }
}

export async function fetchUrlAsInlineData(
  url: string,
): Promise<{ mime_type: string; data: string } | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const contentType =
      response.headers.get('content-type')?.split(';')[0]?.trim() ||
      'application/octet-stream'
    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, i + chunk)
      binary += String.fromCharCode.apply(
        null,
        slice as unknown as number[],
      )
    }
    return {
      mime_type: contentType,
      data: btoa(binary),
    }
  } catch {
    return null
  }
}

export async function geminiGenerateJson(
  parts: GeminiPart[],
): Promise<{ ok: true; json: unknown } | { ok: false; error: string }> {
  const apiKey = geminiApiKey()
  if (!apiKey) {
    return { ok: false, error: 'GEMINI_API_KEY not configured' }
  }

  const model = geminiModel()
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    return {
      ok: false,
      error: `Gemini error: ${detail.slice(0, 400)}`,
    }
  }

  const payload = await response.json()
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('')
    ?.trim()

  if (!text) {
    return { ok: false, error: 'Gemini returned an empty response.' }
  }

  try {
    return { ok: true, json: JSON.parse(text) }
  } catch {
    return {
      ok: false,
      error: 'Gemini returned non-JSON content.',
    }
  }
}
