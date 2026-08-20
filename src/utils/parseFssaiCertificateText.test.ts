import { describe, expect, it } from 'vitest'
import {
  countParsedFields,
  parseFssaiCertificateText,
} from '@/utils/parseFssaiCertificateText'

const SAMPLE_OCR = `
Registration Certificate
Registration Number 22223028000424
1. Name and permanent address of Food Business Operator (FBO):
BLACK HEAVEN CAFE
RAHIL SHEIKH, MPPG SETHU MARG, KRISHNA NAGAR, CHAMTIKHERA CHORAHA, CHITTORGARH, Chittaurgarh, Chittorgarh, Rajasthan-312001
2. Address of location where food business is to be conducted / premises:
RAHIL SHEIKH, MPPG SETHU MARG, KRISHNA NAGAR, CHAMTIKHERA CHORAHA, CHITTORGARH, Chittaurgarh, Chittorgarh, Rajasthan-312001
3. Kind of Business: Petty Retailer of snacks/tea shops, Food Vending Establishment
4. Photo Identity Card: N/A
Place: Chittaurgarh
Issued On: 29-12-2023 (New Registration)
Valid Upto: 28-12-2026
`

describe('parseFssaiCertificateText', () => {
  it('extracts core fields from FoSCoS-style OCR', () => {
    const parsed = parseFssaiCertificateText(SAMPLE_OCR)
    expect(parsed.fssaiLicense).toBe('22223028000424')
    expect(parsed.legalName).toBe('BLACK HEAVEN CAFE')
    expect(parsed.fssaiValidUntil).toBe('2026-12-28')
    expect(parsed.pincode).toBe('312001')
    expect(parsed.state?.toLowerCase()).toContain('rajasthan')
    expect(parsed.kindOfBusiness?.toLowerCase()).toContain('petty retailer')
    expect(parsed.proprietorName?.toUpperCase()).toContain('RAHIL')
    expect(countParsedFields(parsed)).toBeGreaterThanOrEqual(5)
  })

  it('parses noisy valid/issued dates including compact stamps', () => {
    const parsed = parseFssaiCertificateText(`
      Issued On: 29.12.2023 (New Registration)
      Vid Up: 28-12. 2026
      License Issued On: 29122023
    `)
    expect(parsed.fssaiValidUntil).toBe('2026-12-28')
    expect(parsed.issuedOn).toBe('2023-12-29')
  })
})
