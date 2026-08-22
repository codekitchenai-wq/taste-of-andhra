import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isPdfFile } from '@/utils/extractFssaiFromPdf'
import {
  countParsedFields,
  isFoscosReceiptText,
  parseFssaiCertificateText,
} from '@/utils/parseFssaiCertificateText'

const RECEIPT_PATH = 'docs/samples/fssai-payment-receipt-sample.pdf'

/**
 * Node cannot load the browser pdfjs build (DOMMatrix). This still exercises
 * the same PDF text → parse path the intake UI uses after pdf.js extracts text.
 */
describe('FoSCoS receipt PDF sample (real file)', () => {
  it('extracts intake form fields from the user sample PDF', async () => {
    const bytes = readFileSync(RECEIPT_PATH)
    expect(bytes.byteLength).toBe(419_664)

    const file = new File([bytes], 'FSSAI.pdf', { type: 'application/pdf' })
    expect(isPdfFile(file)).toBe(true)
    expect(isPdfFile(new File([bytes], 'FSSAI.pdf', { type: '' }))).toBe(true)

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(bytes),
      useSystemFonts: true,
    }).promise
    expect(doc.numPages).toBe(1)

    let pdfText = ''
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum)
      const content = await page.getTextContent()
      pdfText +=
        content.items
          .map((item: { str?: string }) => item.str || '')
          .join(' ') + '\n'
    }

    expect(isFoscosReceiptText(pdfText)).toBe(true)
    const fields = parseFssaiCertificateText(pdfText)
    expect(countParsedFields(fields)).toBeGreaterThanOrEqual(6)
    expect(fields.legalName).toMatch(/Taste Of Andhra/i)
    expect(fields.proprietorName).toMatch(/KORADA DEVI/i)
    expect(fields.address).toMatch(/Harsha Pride/i)
    expect(fields.state).toMatch(/Karnataka/i)
    expect(fields.pincode).toBe('560093')
    expect(fields.city).toMatch(/Bengaluru/i)
    expect(fields.issuedOn).toBe('2025-11-22')
    expect(fields.kindOfBusiness).toMatch(/Petty Retailer/i)
    expect(fields.fssaiValidUntil).toBe('2026-11-22')
    // Receipt Reference No must not become a fake 14-digit licence
    expect(fields.fssaiLicense).toBeNull()
    expect(fields.email).toBeNull()
  })
})
