import type { Category } from '@/types/Category'

export function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    organization_id: (row.organization_id as string) ?? '',
    name: row.name as string,
    slug: row.slug as string,
    description: (row.description as string | null) ?? null,
    image_url: (row.image_url as string | null) ?? null,
    display_order: row.display_order as number,
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}
