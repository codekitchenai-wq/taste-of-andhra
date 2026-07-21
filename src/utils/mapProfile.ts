import type { Profile } from '@/types/Profile'
import type { UserRole } from '@/types/enums'

export function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    full_name: row.full_name as string,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    role: row.role as UserRole,
    avatar_url: (row.avatar_url as string | null) ?? null,
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}
