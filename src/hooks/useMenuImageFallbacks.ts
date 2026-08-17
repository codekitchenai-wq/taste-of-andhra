import { useMemo } from 'react'
import type { Category } from '@/types/Category'
import type { Dish } from '@/types/Dish'
import { isAndhraLocalAsset } from '@/utils/menuImage'

/** Best photo per category: category row, else any dish in that category. */
export function useMenuImageFallbacks(
  categories: Category[],
  dishes: Dish[],
): Map<string, string> {
  return useMemo(() => {
    const map = new Map<string, string>()

    for (const category of categories) {
      if (category.image_url && !isAndhraLocalAsset(category.image_url)) {
        map.set(category.id, category.image_url)
      }
    }

    for (const dish of dishes) {
      if (
        dish.image_url &&
        !isAndhraLocalAsset(dish.image_url) &&
        !map.has(dish.category_id)
      ) {
        map.set(dish.category_id, dish.image_url)
      }
    }

    return map
  }, [categories, dishes])
}
