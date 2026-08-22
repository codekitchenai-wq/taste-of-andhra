/**
 * Pre-release smoke: FSSAI extract against real sample PDF + certificate fixture text.
 * Usage: node scripts/verify-fssai-sample.mjs [path-to-pdf]
 */
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

const pdfPath = process.argv[2] || 'c:/Users/devik/Downloads/FSSAI.pdf'

const { parseFssaiCertificateText, countParsedFields, isFoscosReceiptText } =
  await import('../src/utils/parseFssaiCertificateText.ts')

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function mapToForm(fields) {
  return {
    legalName: fields.legalName || '',
    preferredStoreName: fields.legalName || '',
    fssaiLicense: fields.fssaiLicense || '',
    fssaiValidUntil: fields.fssaiValidUntil
      ? String(fields.fssaiValidUntil).slice(0, 10)
      : '',
    fssaiIssuedOn: fields.issuedOn ? String(fields.issuedOn).slice(0, 10) : '',
    addressFromFssai: fields.address || '',
    city: fields.city || '',
    state: fields.state || '',
    pincode: fields.pincode
      ? String(fields.pincode).replace(/\D/g, '').slice(0, 6)
      : '',
    ownerName: fields.proprietorName || '',
    cuisineType: fields.kindOfBusiness || '',
  }
}

console.log('=== 1) Certificate fixture (FoSCoS Registration Certificate text) ===')
const certText = `
Registration Certificate under FSS Act, 2006
Registration Number: 22223028000424
1. Name and permanent address of Food Business Operator (FBO):
BLACK HEAVEN CAFE
RAHIL SHEIKH, MPPG SETHU MARG, KRISHNA NAGAR, CHAMTIKHERA CHORAHA, CHITTORGARH, Chittaurgarh, Chittorgarh, Rajasthan-312001
2. Address of location where food business is to be conducted / premises:
RAHIL SHEIKH, MPPG SETHU MARG, KRISHNA NAGAR, CHAMTIKHERA CHORAHA, CHITTORGARH, Chittaurgarh, Chittorgarh, Rajasthan-312001
3. Kind of Business: Petty Retailer of snacks/tea shops, Food Vending Establishment
Place: Chittaurgarh
Issued On: 29-12-2023 (New Registration)
Valid Upto: 28-12-2026
`
const cert = parseFssaiCertificateText(certText)
const certForm = mapToForm(cert)
assert(cert.fssaiLicense === '22223028000424', 'cert licence')
assert(cert.legalName === 'BLACK HEAVEN CAFE', 'cert legal name')
assert(cert.fssaiValidUntil === '2026-12-28', 'cert valid until')
assert(cert.issuedOn === '2023-12-29', 'cert issued')
assert(countParsedFields(cert) >= 7, 'cert field count')
assert(!isFoscosReceiptText(certText), 'cert is not receipt')
console.log('OK form mapping:', JSON.stringify(certForm, null, 2))

console.log('\n=== 2) User sample PDF (payment receipt) ===')
assert(fs.existsSync(pdfPath), `missing PDF: ${pdfPath}`)

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const data = new Uint8Array(fs.readFileSync(pdfPath))
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
let pdfText = ''
for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
  const page = await doc.getPage(i)
  const content = await page.getTextContent()
  pdfText +=
    content.items.map((it) => ('str' in it ? it.str : '')).join(' ') + '\n'
}

const receipt = parseFssaiCertificateText(pdfText)
const receiptForm = mapToForm(receipt)
assert(isFoscosReceiptText(pdfText), 'user PDF detected as receipt')
assert(receipt.fssaiLicense == null, 'must not invent licence from Reference No')
assert(
  /taste of andhra/i.test(receipt.legalName || ''),
  `legal name: ${receipt.legalName}`,
)
assert(
  /korada/i.test(receipt.proprietorName || ''),
  `proprietor: ${receipt.proprietorName}`,
)
assert(/harsha pride/i.test(receipt.address || ''), 'premises address')
assert(receipt.state?.toLowerCase() === 'karnataka', 'state')
assert(receipt.pincode === '560093', 'pincode')
assert(receipt.city === 'Bengaluru', 'city')
assert(receipt.issuedOn === '2025-11-22', 'receipt date as issuedOn')
assert(receipt.fssaiValidUntil === '2026-11-22', '1 Year(s) from issue date')
assert(countParsedFields(receipt) >= 6, 'receipt field count')
assert(receipt.email == null, 'must not use foscos helpdesk email')
assert(receiptForm.preferredStoreName === receiptForm.legalName, 'display name')
console.log('OK form mapping:', JSON.stringify(receiptForm, null, 2))

console.log('\n=== 3) PDF MIME fallback helper ===')
function isPdfFile(file) {
  if (file.type === 'application/pdf') return true
  if (/\.pdf$/i.test(file.name)) return true
  return false
}
assert(
  isPdfFile({ name: 'FSSAI.pdf', type: '' }),
  'empty type + .pdf name should count as PDF',
)
assert(
  isPdfFile({ name: 'x.bin', type: 'application/pdf' }),
  'application/pdf type',
)
assert(!isPdfFile({ name: 'photo.jpg', type: 'image/jpeg' }), 'jpeg not pdf')

console.log('\n=== PASS — sample data checks ready for manual UI retest ===')
console.log('File:', path.resolve(pdfPath))
console.log('Pages:', doc.numPages, '| bytes:', fs.statSync(pdfPath).size)
