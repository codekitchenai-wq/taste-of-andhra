import {
  DEFAULT_GSTIN,
  GST_CGST_RATE,
  GST_SGST_RATE,
} from '@/constants/LOYALTY'
import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { GstInvoice } from '@/types/GstInvoice'
import type { OrderFullDetails } from '@/types/Order'
import type { Branch } from '@/types/Branch'
import * as branchService from '@/services/branchService'
import { supabase } from '@/services/supabaseClient'

function mapInvoice(row: Record<string, unknown>): GstInvoice {
  return {
    id: row.id as string,
    order_id: row.order_id as string,
    branch_id: row.branch_id as string,
    invoice_number: row.invoice_number as string,
    gstin: row.gstin as string,
    taxable_amount: Number(row.taxable_amount),
    cgst: Number(row.cgst),
    sgst: Number(row.sgst),
    igst: Number(row.igst),
    total: Number(row.total),
    issued_at: row.issued_at as string,
    created_at: row.created_at as string,
  }
}

function generateInvoiceNumber(orderNumber: string): string {
  return `INV-${orderNumber.replace(/^TOA-/, '')}`
}

export async function getInvoiceByOrderId(
  orderId: string,
): Promise<ServiceResponse<GstInvoice | null>> {
  const { data, error } = await supabase
    .from('gst_invoices')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load invoice.', error.message)
  }

  return createSuccessResponse(data ? mapInvoice(data) : null)
}

export async function ensureInvoiceForOrder(
  order: OrderFullDetails,
): Promise<ServiceResponse<GstInvoice>> {
  const existing = await getInvoiceByOrderId(order.id)
  if (!existing.success) return existing
  if (existing.data) {
    return createSuccessResponse(existing.data)
  }

  let branch: Branch | null = null
  if (order.branch_id) {
    const branchResult = await branchService.getBranchById(order.branch_id)
    if (branchResult.success) branch = branchResult.data
  }
  if (!branch) {
    const defaultResult = await branchService.getDefaultBranch()
    if (!defaultResult.success) return defaultResult
    branch = defaultResult.data
  }

  const taxable = order.subtotal - order.discount
  const cgst = Math.round(taxable * GST_CGST_RATE * 100) / 100
  const sgst = Math.round(taxable * GST_SGST_RATE * 100) / 100
  const invoiceTotal =
    Math.round((taxable + cgst + sgst + order.delivery_charge) * 100) / 100

  const { data, error } = await supabase
    .from('gst_invoices')
    .insert({
      order_id: order.id,
      branch_id: branch.id,
      invoice_number: generateInvoiceNumber(order.order_number),
      gstin: branch.gstin ?? DEFAULT_GSTIN,
      taxable_amount: taxable,
      cgst,
      sgst,
      igst: 0,
      total: invoiceTotal,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      const again = await getInvoiceByOrderId(order.id)
      if (again.success && again.data) {
        return createSuccessResponse(again.data)
      }
    }
    return createErrorResponse('Unable to create GST invoice.', error.message)
  }

  return createSuccessResponse(mapInvoice(data))
}

export interface InvoiceViewModel {
  invoice: GstInvoice
  order: OrderFullDetails
  branch: Branch
}

export async function getInvoiceView(
  _orderId: string,
  order: OrderFullDetails,
): Promise<ServiceResponse<InvoiceViewModel>> {
  const invoiceResult = await ensureInvoiceForOrder(order)
  if (!invoiceResult.success) return invoiceResult

  const branchResult = await branchService.getBranchById(
    invoiceResult.data.branch_id,
  )
  if (!branchResult.success) return branchResult

  return createSuccessResponse({
    invoice: invoiceResult.data,
    order,
    branch: branchResult.data,
  })
}
