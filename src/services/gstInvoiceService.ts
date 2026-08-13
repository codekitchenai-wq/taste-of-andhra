import {
  GST_INVOICES_DISABLED_MESSAGE,
  GST_INVOICES_GSTIN_REQUIRED_MESSAGE,
} from '@/constants/GST'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import * as settingsService from '@/services/settingsService'
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
import { insertWithOrgFallback } from '@/utils/insertWithOrgFallback'
import {
  calculateGstInvoiceAmounts,
  generateGstInvoiceNumber,
} from '@/utils/gstInvoice'

function mapInvoice(row: Record<string, unknown>): GstInvoice {
  return {
    id: row.id as string,
    organization_id: (row.organization_id as string) ?? '',
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

function isRpcMissingError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('could not find the function') ||
    (normalized.includes('ensure_gst_invoice') &&
      (normalized.includes('does not exist') ||
        normalized.includes('schema cache')))
  )
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

async function ensureInvoiceViaRpc(
  orderId: string,
): Promise<ServiceResponse<GstInvoice> | null> {
  const { data, error } = await supabase.rpc('ensure_gst_invoice', {
    p_order_id: orderId,
  })

  if (error) {
    if (isRpcMissingError(error.message)) return null
    return createErrorResponse('Unable to create GST invoice.', error.message)
  }

  if (!data || typeof data !== 'object') {
    return createErrorResponse('Unable to create GST invoice.')
  }

  return createSuccessResponse(mapInvoice(data as Record<string, unknown>))
}

async function resolveInvoiceBranch(
  order: OrderFullDetails,
): Promise<ServiceResponse<Branch>> {
  if (order.branch_id) {
    const branchResult = await branchService.getBranchById(order.branch_id)
    if (branchResult.success) return branchResult
  }

  return branchService.getDefaultBranch()
}

export async function ensureInvoiceForOrder(
  order: OrderFullDetails,
): Promise<ServiceResponse<GstInvoice>> {
  const existing = await getInvoiceByOrderId(order.id)
  if (existing.success && existing.data) {
    return createSuccessResponse(existing.data)
  }

  const gstSettings = await settingsService.getGstSettings()
  if (!gstSettings.success || !gstSettings.data.enabled) {
    return createErrorResponse(GST_INVOICES_DISABLED_MESSAGE)
  }

  const rpcResult = await ensureInvoiceViaRpc(order.id)
  if (rpcResult) return rpcResult

  if (!existing.success) return existing

  const branchResult = await resolveInvoiceBranch(order)
  if (!branchResult.success) return branchResult
  const branch = branchResult.data
  const gstin =
    branch.gstin?.trim() || gstSettings.data.gstin.trim() || ''
  if (!gstin) {
    return createErrorResponse(GST_INVOICES_GSTIN_REQUIRED_MESSAGE)
  }

  const amounts = calculateGstInvoiceAmounts({
    subtotal: order.subtotal,
    discount: order.discount,
    delivery_charge: order.delivery_charge,
  })

  const { data, error } = await insertWithOrgFallback(supabase, 'gst_invoices', {
    organization_id: order.organization_id || DEFAULT_ORGANIZATION_ID,
    order_id: order.id,
    branch_id: branch.id,
    invoice_number: generateGstInvoiceNumber(order.order_number),
    gstin,
    taxable_amount: amounts.taxable_amount,
    cgst: amounts.cgst,
    sgst: amounts.sgst,
    igst: amounts.igst,
    total: amounts.total,
  })

  if (error) {
    if (error.code === '23505') {
      const again = await getInvoiceByOrderId(order.id)
      if (again.success && again.data) {
        return createSuccessResponse(again.data)
      }
    }
    return createErrorResponse('Unable to create GST invoice.', error.message)
  }

  if (!data) {
    return createErrorResponse('Unable to create GST invoice.')
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
