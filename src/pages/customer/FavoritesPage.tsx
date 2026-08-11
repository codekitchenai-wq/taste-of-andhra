import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { MenuDishCard } from '@/components/menu/MenuDishCard'
import { Container } from '@/components/ui/Container'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ROUTES } from '@/constants/ROUTES'
import { usePublicCategories } from '@/hooks/usePublicCategories'
import * as favoriteService from '@/services/favoriteService'
import type { FavoriteWithDish } from '@/services/favoriteService'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { categories } = usePublicCategories()
  const [favorites, setFavorites] = useState<FavoriteWithDish[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const categoryNames = useMemo(
    () =>
      Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await favoriteService.getFavorites()

    if (result.success) {
      setFavorites(result.data)
    } else {
      setError(result.message)
      setFavorites([])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return (
    <Container as="div" className="py-8 md:py-12">
      <PageHeader
        title="My Favorites"
        description="Dishes you've saved for quick ordering."
      />

      {isLoading && <LoadingState variant="grid" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && favorites.length === 0 && (
        <EmptyState
          title="No favorites yet"
          description="Save dishes you love from the menu to find them here quickly."
          actionLabel="Browse Menu"
          onAction={() => navigate(ROUTES.MENU)}
          icon={Heart}
        />
      )}

      {!isLoading && !error && favorites.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {favorites.map((favorite) => (
            <MenuDishCard
              key={favorite.id}
              dish={favorite.dish}
              categoryName={categoryNames[favorite.dish.category_id]}
            />
          ))}
        </div>
      )}
    </Container>
  )
}
