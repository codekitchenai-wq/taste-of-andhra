import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { createWorker } from 'tesseract.js'
import {
  countParsedFields,
  parseFssaiCertificateText,
} from '@/utils/parseFssaiCertificateText'

const samplePath = path.resolve(
  process.cwd(),
  'docs/samples/fssai-registration-certificate-sample.png',
)

describe('FSSAI local OCR smoke (sample certificate)', () => {
  it(
    'reads core fields from low-res sample after preprocess',
    async () => {
      expect(fs.existsSync(samplePath)).toBe(true)

      const meta = await sharp(samplePath).metadata()
      expect(meta.width).toBeGreaterThan(100)

      // Mirror browser preprocess: grayscale, normalize, upscale ~2200px
      const buf = await sharp(samplePath)
        .grayscale()
        .normalize()
        .resize({ width: 2200, kernel: 'lanczos3' })
        .sharpen()
        .png()
        .toBuffer()

      const worker = await createWorker('eng', 1, { logger: () => {} })
      let text = ''
      try {
        const result = await worker.recognize(buf)
        text = result.data.text || ''
      } finally {
        await worker.terminate()
      }

      expect(text.trim().length).toBeGreaterThan(80)

      const fields = parseFssaiCertificateText(text)
      const n = countParsedFields(fields)
      expect(n).toBeGreaterThanOrEqual(3)

      // Licence may have 1 OCR digit error on tiny sources — require 14 digits starting 2
      expect(String(fields.fssaiLicense || '')).toMatch(/^2\d{13}$/)
      expect(fields.pincode).toBe('312001')
      expect(String(fields.state || '')).toMatch(/Rajasthan/i)

      const blob = `${fields.legalName || ''} ${fields.address || ''} ${fields.kindOfBusiness || ''} ${fields.fssaiValidUntil || ''}`
      expect(blob.toUpperCase()).toMatch(
        /HEAVEN|CAFE|CHITTOR|PETTY|2026|RAHIL|RAMIL|KRISHNA/,
      )
    },
    180_000,
  )
})
