import {
  countParsedFields,
  parseFssaiCertificateText,
  type ParsedFssaiFields,
} from '@/utils/parseFssaiCertificateText'

/**
 * Extract FoSCoS/FSSAI fields from an official PDF (text layer).
 * Much more reliable than photo OCR — prefer downloading the PDF from FoSCoS.
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

  return {
    fields,
    pdfText,
    note:
      n > 0
        ? `Filled ${n} field(s) from FSSAI PDF text (free, accurate) — review before creating.`
        : 'PDF had little readable text. Use the official FoSCoS download PDF (not a scanned photo saved as PDF).',
  }
}
