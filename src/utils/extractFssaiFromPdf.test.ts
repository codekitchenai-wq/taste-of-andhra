import { describe, expect, it } from 'vitest'
import { parseFssaiCertificateText, countParsedFields } from '@/utils/parseFssaiCertificateText'

/** Simulates clean FoSCoS PDF text layer (not a photo OCR dump). */
const FOSCOS_PDF_TEXT = `
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

describe('FoSCoS PDF-quality text parse', () => {
  it('fills core legal + date fields cleanly', () => {
    const parsed = parseFssaiCertificateText(FOSCOS_PDF_TEXT)
    expect(countParsedFields(parsed)).toBeGreaterThanOrEqual(7)
    expect(parsed.legalName).toBe('BLACK HEAVEN CAFE')
    expect(parsed.fssaiLicense).toBe('22223028000424')
    expect(parsed.fssaiValidUntil).toBe('2026-12-28')
    expect(parsed.issuedOn).toBe('2023-12-29')
    expect(parsed.pincode).toBe('312001')
    expect(parsed.state).toMatch(/Rajasthan/i)
  })
})
