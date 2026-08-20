import {
  countParsedFields,
  parseFssaiCertificateText,
  type ParsedFssaiFields,
} from '@/utils/parseFssaiCertificateText'

const TESSERACT_VERSION = '7.0.0'
const TESSERACT_CORE_VERSION = '7.0.0'

function emptyFields(): ParsedFssaiFields {
  return {
    legalName: null,
    fssaiLicense: null,
    fssaiValidUntil: null,
    issuedOn: null,
    address: null,
    city: null,
    state: null,
    pincode: null,
    proprietorName: null,
    phone: null,
    email: null,
    kindOfBusiness: null,
  }
}

function mergeFields(
  base: ParsedFssaiFields,
  extra: Partial<ParsedFssaiFields>,
): ParsedFssaiFields {
  const next = { ...base }
  for (const key of Object.keys(extra) as (keyof ParsedFssaiFields)[]) {
    const value = extra[key]
    if (value && !next[key]) next[key] = value
  }
  return next
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not load certificate image.'))
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Upscale + contrast so phone / low-res cert photos OCR better. */
async function prepareCanvas(file: File): Promise<HTMLCanvasElement> {
  const img = await loadImageElement(file)
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  // Tiny phone / compressed samples (~400px) need heavy upscale for Tesseract
  const targetW = srcW < 900 ? 2800 : srcW < 1600 ? 2200 : srcW
  const scale = targetW / Math.max(srcW, 1)
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas unavailable.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  // Grayscale + contrast stretch (helps FoSCoS scans)
  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data
  let min = 255
  let max = 0
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    if (g < min) min = g
    if (g > max) max = g
  }
  const range = Math.max(1, max - min)
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    // Slightly boost contrast further for washed phone photos
    let v = ((g - min) / range) * 255
    v = (v - 128) * 1.25 + 128
    v = Math.max(0, Math.min(255, v))
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

function parseQrPayload(raw: string): Partial<ParsedFssaiFields> {
  const text = raw.trim()
  if (!text) return {}

  // Prefer structured FoSCoS-style text / JSON if present
  try {
    const json = JSON.parse(text) as Record<string, unknown>
    return {
      legalName: String(json.legalName ?? json.name ?? json.firmName ?? '') || null,
      fssaiLicense: String(
        json.fssaiLicense ?? json.licenseNo ?? json.registrationNumber ?? '',
      ) || null,
      address: String(json.address ?? '') || null,
      fssaiValidUntil: String(json.validUpto ?? json.fssaiValidUntil ?? '') || null,
    }
  } catch {
    // not JSON
  }

  const fromText = parseFssaiCertificateText(text)
  if (countParsedFields(fromText) > 0) return fromText

  const license =
    text.match(/\b([12]\d{13})\b/)?.[1] ||
    text.match(/license[=:/]\s*([0-9]{10,16})/i)?.[1] ||
    null
  return license ? { fssaiLicense: license } : { address: text.slice(0, 280) }
}

async function tryDecodeQr(
  canvas: HTMLCanvasElement,
): Promise<{ fields: Partial<ParsedFssaiFields>; raw: string | null }> {
  try {
    const { default: jsQR } = await import('jsqr')
    const ctx = canvas.getContext('2d')
    if (!ctx) return { fields: {}, raw: null }

    const attempts: Array<{ x: number; y: number; w: number; h: number }> = [
      { x: 0, y: 0, w: canvas.width, h: canvas.height },
      // FoSCoS QR is usually near registration number (upper-right / mid-right)
      {
        x: Math.floor(canvas.width * 0.45),
        y: 0,
        w: Math.floor(canvas.width * 0.55),
        h: Math.floor(canvas.height * 0.45),
      },
      {
        x: Math.floor(canvas.width * 0.55),
        y: Math.floor(canvas.height * 0.05),
        w: Math.floor(canvas.width * 0.4),
        h: Math.floor(canvas.height * 0.35),
      },
    ]

    for (const box of attempts) {
      const imageData = ctx.getImageData(box.x, box.y, box.w, box.h)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })
      if (code?.data) {
        return { fields: parseQrPayload(code.data), raw: code.data }
      }
    }
    return { fields: {}, raw: null }
  } catch {
    return { fields: {}, raw: null }
  }
}

async function runTesseract(canvas: HTMLCanvasElement): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  // Explicit CDN paths — Vite production breaks default worker resolution.
  const worker = await createWorker('eng', 1, {
    workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`,
    corePath: `https://cdn.jsdelivr.net/npm/tesseract.js-core@${TESSERACT_CORE_VERSION}/tesseract-core-simd-lstm.wasm.js`,
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
  })
  try {
    const {
      data: { text },
    } = await worker.recognize(canvas)
    return text || ''
  } finally {
    await worker.terminate()
  }
}

/**
 * Free local extract: QR (when present) + Tesseract OCR + FoSCoS heuristics.
 */
export async function extractFssaiLocalFromFile(
  file: File,
): Promise<{
  fields: ParsedFssaiFields
  ocrText: string
  note: string
  source: 'qr' | 'ocr' | 'qr+ocr' | 'none'
}> {
  const canvas = await prepareCanvas(file)
  const qr = await tryDecodeQr(canvas)
  let fields = mergeFields(emptyFields(), qr.fields)
  let ocrText = ''
  let source: 'qr' | 'ocr' | 'qr+ocr' | 'none' =
    countParsedFields(fields) > 0 ? 'qr' : 'none'

  // OCR always helps fill name/address even when QR only has a licence URL
  try {
    ocrText = await runTesseract(canvas)
    const ocrFields = parseFssaiCertificateText(ocrText)
    const before = countParsedFields(fields)
    fields = mergeFields(fields, ocrFields)
    const after = countParsedFields(fields)
    if (after > before) {
      source = before > 0 ? 'qr+ocr' : 'ocr'
    } else if (after === 0 && ocrText.trim()) {
      // OCR ran but heuristics missed — still expose raw licence/date if possible
      fields = mergeFields(fields, parseFssaiCertificateText(ocrText))
      if (countParsedFields(fields) > 0) source = 'ocr'
    }
  } catch (error) {
    if (countParsedFields(fields) === 0) {
      throw error instanceof Error
        ? error
        : new Error('On-device OCR failed to start.')
    }
  }

  const n = countParsedFields(fields)
  const note =
    n > 0
      ? `Filled ${n} field(s) with free on-device ${source === 'qr' ? 'QR' : source === 'qr+ocr' ? 'QR + OCR' : 'OCR'} — review carefully (photos are less accurate than FoSCoS PDF).`
      : ocrText.trim()
        ? 'Photo OCR could not map enough fields. Download the official FoSCoS PDF and upload that instead (much more accurate), or fill manually.'
        : 'Could not read this photo. Upload the official FoSCoS PDF certificate, or take a sharper full-page photo.'

  return { fields, ocrText, note, source }
}
