import { useCallback, useEffect, useState } from 'react'
import { LOCAL_IMAGES } from '@/constants/IMAGES'
import type { HomeCategory, HomeDish } from '@/data/home'
import * as categoryService from '@/services/categoryService'
import * as dishService from '@/services/dishService'
import type { Dish } from '@/types/Dish'

const CATEGORY_IMAGE_FALLBACKS: Record<string, string> = {
  starters: LOCAL_IMAGES.categories.starters,
  biryani: LOCAL_IMAGES.categories.biryani,
  curries: LOCAL_IMAGES.categories.curries,
  breads: LOCAL_IMAGES.categories.breads,
  beverages: LOCAL_IMAGES.categories.beverages,
  desserts: LOCAL_IMAGES.categories.desserts,
}

function toHomeDish(dish: Dish): HomeDish {
  return {
    id: dish.id,
    name: dish.name,
    slug: dish.slug,
    description: dish.description?.trim() || 'Authentic Andhra specialty.',
    price: dish.price,
    imageUrl: dish.image_url || LOCAL_IMAGES.hero,
    isVeg: dish.is_veg,
    rating: dish.rating ?? 0,
    prepTime: dish.preparation_time ?? 0,
  }
}

function categoryImage(slug: string, imageUrl: string | null): string {
  if (imageUrl) return imageUrl
  return CATEGORY_IMAGE_FALLBACKS[slug] ?? LOCAL_IMAGES.hero
}

export function useHomeFeatured() {
  const [categories, setCategories] = useState<HomeCategory[]>([])
  const [dishes, setDishes] = useState<HomeDish[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const [categoryResult, dishResult] = await Promise.all([
      categoryService.getCategories(),
      dishService.getDishes(),
    ])

    if (!categoryResult.success) {
      setError(categoryResult.message)
      setCategories([])
      setDishes([])
      setIsLoading(false)
      return
    }

    if (!dishResult.success) {
      setError(dishResult.message)
      setCategories([])
      setDishes([])
      setIsLoading(false)
      return
    }

    const counts = new Map<string, number>()
    for (const dish of dishResult.data) {
      counts.set(dish.category_id, (counts.get(dish.category_id) ?? 0) + 1)
    }

    const homeCategories = categoryResult.data
      .filter((category) => category.is_active)
      .sort((a, b) => a.display_order - b.display_order)
      .slice(0, 4)
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        imageUrl: categoryImage(category.slug, category.image_url),
        dishCount: counts.get(category.id) ?? 0,
      }))

    const featured = dishResult.data.filter((dish) => dish.is_featured)
    const featuredSource =
      featured.length > 0
        ? featured
        : [...dishResult.data].sort(
            (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
          )

    setCategories(homeCategories)
    setDishes(featuredSource.slice(0, 4).map(toHomeDish))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { categories, dishes, isLoading, error, refetch }
}
