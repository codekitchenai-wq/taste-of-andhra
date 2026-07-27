export interface GstInvoice {
  id: string
  organization_id: string
  order_id: string
  branch_id: string
  invoice_number: string
  gstin: string
  taxable_amount: number
  cgst: number
  sgst: number
  igst: number
  total: number
  issued_at: string
  created_at: string
}
