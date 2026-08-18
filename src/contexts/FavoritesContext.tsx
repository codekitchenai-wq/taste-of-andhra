import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import * as favoriteService from '@/services/favoriteService'
import type { ServiceResponse } from '@/types/api'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useAuth } from '@/hooks/useAuth'

interface FavoritesContextValue {
  favoriteIds: Set<string>
  isFavorite: (dishId: string) => boolean
  toggle: (
    dishId: string,
  ) => Promise<ServiceResponse<{ isFavorite: boolean }>>
  refresh: () => Promise<void>
  isLoading: boolean
  isUpdating: boolean
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const { organizationId } = useOrganization()
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set())
      return
    }

    setIsLoading(true)
    const result = await favoriteService.getFavoriteDishIds()
    setIsLoading(false)

    if (result.success) {
      setFavoriteIds(new Set(result.data))
    }
  }, [isAuthenticated, organizationId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const isFavorite = (dishId: string) => favoriteIds.has(dishId)

  const toggle = async (
    dishId: string,
  ): Promise<ServiceResponse<{ isFavorite: boolean }>> => {
    setIsUpdating(true)
    const result = await favoriteService.toggleFavorite(dishId)
    setIsUpdating(false)

    if (result.success) {
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (result.data.isFavorite) next.add(dishId)
        else next.delete(dishId)
        return next
      })
    }

    return result
  }

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        isFavorite,
        toggle,
        refresh,
        isLoading,
        isUpdating,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavoritesContext() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) {
    throw new Error('useFavoritesContext must be used within FavoritesProvider')
  }
  return ctx
}
