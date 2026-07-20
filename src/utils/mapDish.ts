import type { Dish } from '@/types/Dish'

export interface DishWithCategory extends Dish {
  category_name: string
}

export function mapDish(row: Record<string, unknown>): Dish {
  return {
    id: row.id as string,
    category_id: row.category_id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: (row.description as string | null) ?? null,
    ingredients: (row.ingredients as string | null) ?? null,
    price: Number(row.price),
    calories: row.calories !== null ? Number(row.calories) : null,
    spice_level: (row.spice_level as Dish['spice_level']) ?? null,
    preparation_time:
      row.preparation_time !== null ? Number(row.preparation_time) : null,
    image_url: (row.image_url as string | null) ?? null,
    is_veg: row.is_veg as boolean,
    is_available: row.is_available as boolean,
    is_featured: row.is_featured as boolean,
    rating: row.rating !== null ? Number(row.rating) : null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function mapDishWithCategory(
  row: Record<string, unknown>,
): DishWithCategory {
  const categories = row.categories as { name: string } | null

  return {
    ...mapDish(row),
    category_name: categories?.name ?? 'Unknown',
  }
}
