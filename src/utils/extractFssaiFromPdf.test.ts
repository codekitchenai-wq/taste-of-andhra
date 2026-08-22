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

/** Real FoSCoS payment receipt (not Registration Certificate) — sample FSSAI.pdf */
const FOSCOS_RECEIPT_TEXT = `
Government of Karnataka Food Safety and Standards Authority of India
Food Safety Compliance System (FoSCoS) https://foscos.fssai.gov.in
Receipt Reference No: 30251122122276946 Date: 22-11-2025
Name of Company/ Organization: KORADA DEVI C/O The Taste Of Andhra
Category of License: Registration [Karnataka] [New Registration]
Premises Address: D 304 Harsha Pride, 6 Cross Kaggadaspura, CV Raman Nagar, K R Puram, B.B.M.P East, , Karnataka, 560093
Kind of Business: Food Services - Petty Retailer of snacks/tea shops, Trade/Retail - Retailer, Trade/Retail - Storage (Except Controlled Atmosphere and Cold), Trade/Retail - Distributor
Mode of Payment: Razorpay Registration Fee Rs 100 (1 Year(s)) Total Fee Paid: Rs 100.00
`

describe('FoSCoS payment receipt parse', () => {
  it('fills name, address, and dates without inventing a licence number', () => {
    const parsed = parseFssaiCertificateText(FOSCOS_RECEIPT_TEXT)
    expect(countParsedFields(parsed)).toBeGreaterThanOrEqual(5)
    expect(parsed.fssaiLicense).toBeNull()
    expect(parsed.legalName).toMatch(/Taste Of Andhra/i)
    expect(parsed.proprietorName).toMatch(/KORADA DEVI/i)
    expect(parsed.address).toMatch(/Harsha Pride/i)
    expect(parsed.state).toMatch(/Karnataka/i)
    expect(parsed.pincode).toBe('560093')
    expect(parsed.city).toMatch(/Bengaluru/i)
    expect(parsed.issuedOn).toBe('2025-11-22')
    expect(parsed.kindOfBusiness).toMatch(/Petty Retailer/i)
    expect(parsed.fssaiValidUntil).toBe('2026-11-22')
  })
})
