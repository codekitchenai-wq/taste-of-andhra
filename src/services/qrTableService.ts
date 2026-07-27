import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { QrTable } from '@/types/QrTable'
import type { Branch } from '@/types/Branch'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { mapBranch } from '@/utils/mapBranch'
import { supabase } from '@/services/supabaseClient'
import { insertWithOrgFallback } from '@/utils/insertWithOrgFallback'

function mapQrTable(row: Record<string, unknown>): QrTable {
  return {
    id: row.id as string,
    organization_id: (row.organization_id as string) ?? '',
    branch_id: row.branch_id as string,
    table_code: row.table_code as string,
    label: row.label as string,
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
  }
}

export interface QrTableWithBranch extends QrTable {
  branch: Branch
}

export function buildQrMenuUrl(tableCode: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/qr/${tableCode}`
}

export function buildQrImageUrl(data: string, size = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}

export async function getQrTables(): Promise<ServiceResponse<QrTableWithBranch[]>> {
  const { data, error } = await supabase
    .from('qr_tables')
    .select('*, branches(*)')
    .order('created_at', { ascending: false })

  if (error) {
    return createErrorResponse('Unable to load QR tables.', error.message)
  }

  const mapped = (data ?? [])
    .map((row) => {
      const branchRow = row.branches as Record<string, unknown> | null
      if (!branchRow) return null
      return {
        ...mapQrTable(row),
        branch: mapBranch(branchRow),
      }
    })
    .filter((item): item is QrTableWithBranch => item != null)

  return createSuccessResponse(mapped)
}

export async function getQrTableByCode(
  tableCode: string,
): Promise<ServiceResponse<QrTableWithBranch>> {
  const { data, error } = await supabase
    .from('qr_tables')
    .select('*, branches(*)')
    .eq('table_code', tableCode)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load QR menu.', error.message)
  }

  if (!data) {
    return createErrorResponse('QR table not found or inactive.')
  }

  const branchRow = data.branches as Record<string, unknown> | null
  if (!branchRow) {
    return createErrorResponse('Branch not found for this table.')
  }

  return createSuccessResponse({
    ...mapQrTable(data),
    branch: mapBranch(branchRow),
  })
}

export async function createQrTable(input: {
  branchId: string
  label: string
  tableCode?: string
}): Promise<ServiceResponse<QrTable>> {
  const code =
    input.tableCode?.trim().toUpperCase() ||
    `T${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  const { data, error } = await insertWithOrgFallback(supabase, 'qr_tables', {
    organization_id: DEFAULT_ORGANIZATION_ID,
    branch_id: input.branchId,
    label: input.label.trim(),
    table_code: code,
    is_active: true,
  })

  if (error) {
    return createErrorResponse('Unable to create QR table.', error.message)
  }

  if (!data) {
    return createErrorResponse('Unable to create QR table.')
  }

  return createSuccessResponse(mapQrTable(data))
}

export async function setQrTableActive(
  id: string,
  isActive: boolean,
): Promise<ServiceResponse<QrTable>> {
  const { data, error } = await supabase
    .from('qr_tables')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return createErrorResponse('Unable to update QR table.', error.message)
  }

  return createSuccessResponse(mapQrTable(data))
}

export async function deleteQrTable(
  id: string,
): Promise<ServiceResponse<null>> {
  const { error } = await supabase.from('qr_tables').delete().eq('id', id)

  if (error) {
    return createErrorResponse('Unable to delete QR table.', error.message)
  }

  return createSuccessResponse(null)
}
