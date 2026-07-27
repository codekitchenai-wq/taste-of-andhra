import type { Branch } from '@/types/Branch'

export function mapBranch(row: Record<string, unknown>): Branch {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    name: row.name as string,
    slug: row.slug as string,
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    address_line1: row.address_line1 as string,
    address_line2: (row.address_line2 as string | null) ?? null,
    city: row.city as string,
    state: row.state as string,
    pincode: row.pincode as string,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    gstin: (row.gstin as string | null) ?? null,
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default),
    opening_hours: (row.opening_hours as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function formatBranchAddress(branch: Branch): string {
  const parts = [
    branch.address_line1,
    branch.address_line2,
    `${branch.city}, ${branch.state}`,
    branch.pincode,
  ].filter(Boolean)

  return parts.join(', ')
}
