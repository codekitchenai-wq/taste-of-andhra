import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Dish } from '@/types/Dish'
import type { Favorite } from '@/types/Favorite'
import { getResolvedOrganizationId } from '@/services/currentOrganization'
import { supabase } from '@/services/supabaseClient'
import { mapDish } from '@/utils/mapDish'
import { requireUserId } from '@/services/requireUserId'
import { insertWithOrgFallback } from '@/utils/insertWithOrgFallback'
import { isMissingColumnError } from '@/utils/supabaseSchema'

export interface FavoriteWithDish extends Favorite {
  dish: Dish
}

function mapFavorite(row: Record<string, unknown>): Favorite {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    organization_id: (row.organization_id as string | undefined) ?? undefined,
    dish_id: row.dish_id as string,
    created_at: row.created_at as string,
  }
}

export async function getFavoriteDishIds(): Promise<ServiceResponse<string[]>> {
  const userResult = await requireUserId()
  if (!userResult.success) return userResult

  const orgId = getResolvedOrganizationId()
  if (!orgId) {
    return createSuccessResponse([])
  }

  const { data, error } = await supabase
    .from('favorites')
    .select('dish_id')
    .eq('user_id', userResult.data)
    .eq('organization_id', orgId)

  if (error && isMissingColumnError(error.message)) {
    const fallback = await supabase
      .from('favorites')
      .select('dish_id')
      .eq('user_id', userResult.data)
    if (fallback.error) {
      return createErrorResponse('Unable to load favorites.', fallback.error.message)
    }
    return createSuccessResponse(
      (fallback.data ?? []).map((row) => row.dish_id as string),
    )
  }

  if (error) {
    return createErrorResponse('Unable to load favorites.', error.message)
  }

  return createSuccessResponse((data ?? []).map((row) => row.dish_id as string))
}

export async function getFavorites(): Promise<
  ServiceResponse<FavoriteWithDish[]>
> {
  const userResult = await requireUserId()
  if (!userResult.success) return userResult

  const orgId = getResolvedOrganizationId()
  if (!orgId) {
    return createSuccessResponse([])
  }

  const { data, error } = await supabase
    .from('favorites')
    .select('*, dishes(*)')
    .eq('user_id', userResult.data)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    return createErrorResponse('Unable to load favorites.', error.message)
  }

  const mapped = (data ?? [])
    .map((row) => {
      const dishRow = row.dishes as Record<string, unknown> | null
      if (!dishRow) return null
      const dish = mapDish(dishRow)
      const orgId = getResolvedOrganizationId()
      if (orgId && dish.organization_id && dish.organization_id !== orgId) {
        return null
      }
      return {
        ...mapFavorite(row),
        dish,
      }
    })
    .filter((item): item is FavoriteWithDish => item != null)

  return createSuccessResponse(mapped)
}

export async function addFavorite(
  dishId: string,
): Promise<ServiceResponse<Favorite>> {
  const userResult = await requireUserId()
  if (!userResult.success) return userResult

  const orgId = getResolvedOrganizationId()
  if (!orgId) {
    return createErrorResponse('Restaurant is not ready. Refresh and try again.')
  }
  const { data, error } = await insertWithOrgFallback(supabase, 'favorites', {
    user_id: userResult.data,
    dish_id: dishId,
    ...(orgId ? { organization_id: orgId } : {}),
  })

  if (error || !data) {
    if (error?.code === '23505') {
      return createErrorResponse('Dish is already in favorites.')
    }
    return createErrorResponse('Unable to add favorite.', error?.message)
  }

  return createSuccessResponse(mapFavorite(data))
}

export async function removeFavorite(
  dishId: string,
): Promise<ServiceResponse<null>> {
  const userResult = await requireUserId()
  if (!userResult.success) return userResult

  const orgId = getResolvedOrganizationId()
  let query = supabase
    .from('favorites')
    .delete()
    .eq('user_id', userResult.data)
    .eq('dish_id', dishId)
  if (orgId) query = query.eq('organization_id', orgId)

  const { error } = await query

  if (error) {
    return createErrorResponse('Unable to remove favorite.', error.message)
  }

  return createSuccessResponse(null)
}

export async function toggleFavorite(
  dishId: string,
): Promise<ServiceResponse<{ isFavorite: boolean }>> {
  const idsResult = await getFavoriteDishIds()
  if (!idsResult.success) return idsResult

  if (idsResult.data.includes(dishId)) {
    const removeResult = await removeFavorite(dishId)
    if (!removeResult.success) return removeResult
    return createSuccessResponse({ isFavorite: false })
  }

  const addResult = await addFavorite(dishId)
  if (!addResult.success) return addResult
  return createSuccessResponse({ isFavorite: true })
}
