import {
  countParsedFields,
  isFoscosReceiptText,
  parseFssaiCertificateText,
  type ParsedFssaiFields,
} from '@/utils/parseFssaiCertificateText'

/**
 * Extract FoSCoS/FSSAI fields from an official PDF (text layer).
 * Handles Registration Certificates and FoSCoS payment receipts.
 */
export async function extractFssaiFromPdf(
  file: File,
): Promise<{
  fields: ParsedFssaiFields
  pdfText: string
  note: string
}> {
  const pdfjs = await import('pdfjs-dist')
  // CDN worker — reliable under Vite production (same pattern as Tesseract)
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const maxPages = Math.min(doc.numPages, 3)
  const chunks: string[] = []

  for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    const line = content.items
      .map((item) => ('str' in item ? String(item.str) : ''))
      .filter(Boolean)
      .join(' ')
    chunks.push(line)
  }

  const pdfText = chunks.join('\n')
  const fields = parseFssaiCertificateText(pdfText)
  const n = countParsedFields(fields)
  const receipt = isFoscosReceiptText(pdfText)

  let note: string
  if (n > 0 && receipt) {
    note = fields.fssaiLicense
      ? `Filled ${n} field(s) from FoSCoS receipt PDF — review before creating.`
      : `Filled ${n} field(s) from FoSCoS payment receipt. Licence number is on the Registration Certificate PDF (not this receipt) — add it when you have that file.`
  } else if (n > 0) {
    note = `Filled ${n} field(s) from FSSAI PDF text — review before creating.`
  } else {
    note =
      'PDF had little readable text. Prefer FoSCoS Registration Certificate or payment receipt PDF (not a scanned photo saved as PDF).'
  }

  return {
    fields,
    pdfText,
    note,
  }
}

/** Windows / some browsers leave File.type empty — also trust .pdf name. */
export function isPdfFile(file: File): boolean {
  if (file.type === 'application/pdf') return true
  if (/\.pdf$/i.test(file.name)) return true
  return false
}
