import { useCallback, useEffect, useState } from 'react'
import { UNMATCHED_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { useOrganization } from '@/contexts/OrganizationContext'
import type { HomeCategory, HomeDish } from '@/data/home'
import * as categoryService from '@/services/categoryService'
import * as dishService from '@/services/dishService'
import type { Dish } from '@/types/Dish'
import { isAndhraLocalAsset } from '@/utils/menuImage'
import {
  categoryImageFallback,
  dishImageFallback,
} from '@/utils/storefrontCopy'

function toHomeDish(dish: Dish, orgSlug: string | null): HomeDish {
  return {
    id: dish.id,
    name: dish.name,
    slug: dish.slug,
    description: dish.description?.trim() || 'Chef special.',
    price: dish.price,
    imageUrl: dishImageFallback(dish.image_url, orgSlug),
    isVeg: dish.is_veg,
    rating: dish.rating ?? 0,
    prepTime: dish.preparation_time ?? 0,
  }
}

function categoryDisplayImage(
  slug: string,
  categoryImage: string | null,
  dishes: Dish[],
  categoryId: string,
  orgSlug: string | null,
): string {
  if (categoryImage && !isAndhraLocalAsset(categoryImage)) {
    return categoryImageFallback(slug, categoryImage, orgSlug)
  }

  const fromDish = dishes.find(
    (dish) =>
      dish.category_id === categoryId &&
      dish.image_url &&
      !isAndhraLocalAsset(dish.image_url),
  )
  if (fromDish?.image_url) {
    return categoryImageFallback(slug, fromDish.image_url, orgSlug)
  }

  return categoryImageFallback(slug, null, orgSlug)
}

export function useHomeFeatured() {
  const {
    organizationId,
    slug: orgSlug,
    isLoading: orgLoading,
  } = useOrganization()
  const [categories, setCategories] = useState<HomeCategory[]>([])
  const [dishes, setDishes] = useState<HomeDish[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    // Unmatched hosts must wait for slug → org resolution. Taste of Andhra
    // already has DEFAULT_ORGANIZATION_ID — do not block the catalog on that.
    if (orgLoading && organizationId === UNMATCHED_ORGANIZATION_ID) return
    setIsLoading(true)
    setError(null)

    try {
    const [categoryResult, dishResult] = await Promise.all([
      categoryService.getCategories(),
      dishService.getDishes(),
    ])

    if (!categoryResult.success) {
      setError(categoryResult.message)
      setCategories([])
      setDishes([])
      return
    }

    if (!dishResult.success) {
      setError(dishResult.message)
      setCategories([])
      setDishes([])
      return
    }

    const counts = new Map<string, number>()
    for (const dish of dishResult.data) {
      counts.set(dish.category_id, (counts.get(dish.category_id) ?? 0) + 1)
    }

    const activeCategories = categoryResult.data
      .filter((category) => category.is_active)
      .sort((a, b) => a.display_order - b.display_order)

    const withOwnPhoto = activeCategories.filter(
      (category) =>
        (category.image_url && !isAndhraLocalAsset(category.image_url)) ||
        dishResult.data.some(
          (dish) =>
            dish.category_id === category.id &&
            dish.image_url &&
            !isAndhraLocalAsset(dish.image_url),
        ),
    )

    const featuredCategories = (
      withOwnPhoto.length >= 4 ? withOwnPhoto : activeCategories
    )
      .slice(0, 4)
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        imageUrl: categoryDisplayImage(
          category.slug,
          category.image_url,
          dishResult.data,
          category.id,
          orgSlug,
        ),
        dishCount: counts.get(category.id) ?? 0,
      }))

    const featured = dishResult.data.filter(
      (dish) => dish.is_featured && dish.image_url && !isAndhraLocalAsset(dish.image_url),
    )
    const featuredSource =
      featured.length > 0
        ? featured
        : [...dishResult.data]
            .filter((dish) => dish.image_url && !isAndhraLocalAsset(dish.image_url))
            .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))

    setCategories(featuredCategories)
    setDishes(
      featuredSource.slice(0, 4).map((dish) => toHomeDish(dish, orgSlug)),
    )
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load menu.')
      setCategories([])
      setDishes([])
    } finally {
      setIsLoading(false)
    }
  }, [organizationId, orgLoading, orgSlug])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { categories, dishes, isLoading, error, refetch }
}
