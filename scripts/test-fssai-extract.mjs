import sharp from 'sharp'
import { createWorker } from 'tesseract.js'
import {
  countParsedFields,
  parseFssaiCertificateText,
} from '../src/utils/parseFssaiCertificateText.ts'

const input = 'docs/samples/fssai-registration-certificate-sample.png'
const meta = await sharp(input).metadata()
console.log('meta', meta.width, 'x', meta.height, meta.format)

const targetW = 2200
const buf = await sharp(input)
  .grayscale()
  .normalize()
  .resize({ width: targetW, kernel: 'lanczos3' })
  .sharpen()
  .png()
  .toBuffer()
console.log('processed bytes', buf.length)

const worker = await createWorker('eng', 1, { logger: () => {} })
try {
  const { data } = await worker.recognize(buf)
  console.log('ocrLen', data.text.length)
  console.log('--- OCR ---')
  console.log(data.text)
  console.log('--- END ---')
  const fields = parseFssaiCertificateText(data.text)
  console.log('fields', JSON.stringify(fields, null, 2))
  console.log('count', countParsedFields(fields))
  process.exit(countParsedFields(fields) >= 2 ? 0 : 2)
} finally {
  await worker.terminate()
}
