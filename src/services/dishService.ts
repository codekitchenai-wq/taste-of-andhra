import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Dish } from '@/types/Dish'
import type { SpiceLevel } from '@/types/enums'
import { supabase } from '@/services/supabaseClient'
import { uploadDishImage } from '@/services/storageService'
import { mapDish, mapDishWithCategory } from '@/utils/mapDish'
import type { DishWithCategory } from '@/utils/mapDish'
import { generateSlug } from '@/utils/slug'

export interface DishFilters {
  categoryId?: string
  isVeg?: boolean
  isAvailable?: boolean
  isFeatured?: boolean
  spiceLevel?: SpiceLevel
  search?: string
  sortBy?: 'price' | 'rating' | 'popularity'
  page?: number
  limit?: number
}

export interface DishFormInput {
  name: string
  description?: string
  ingredients?: string
  categoryId: string
  price: number
  calories?: number
  preparationTime?: number
  imageUrl?: string
  imageFile?: File | null
  isVeg: boolean
  isAvailable?: boolean
  isFeatured?: boolean
  spiceLevel?: SpiceLevel | null
}

function mapDatabaseError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('duplicate key') && normalized.includes('slug')) {
    return 'A dish with this name already exists.'
  }

  if (normalized.includes('foreign key') && normalized.includes('category')) {
    return 'Selected category does not exist.'
  }

  return message
}

async function resolveImageUrl(
  dishId: string,
  input: Pick<DishFormInput, 'imageUrl' | 'imageFile'>,
): Promise<ServiceResponse<string | null>> {
  if (input.imageFile) {
    return uploadDishImage(input.imageFile, dishId)
  }

  return createSuccessResponse(input.imageUrl?.trim() || null)
}

export async function getDishes(
  filters?: DishFilters,
): Promise<ServiceResponse<Dish[]>> {
  let query = supabase
    .from('dishes')
    .select('*')
    .eq('is_available', true)

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }

  if (filters?.isVeg !== undefined) {
    query = query.eq('is_veg', filters.isVeg)
  }

  if (filters?.isFeatured !== undefined) {
    query = query.eq('is_featured', filters.isFeatured)
  }

  if (filters?.spiceLevel) {
    query = query.eq('spice_level', filters.spiceLevel)
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  if (filters?.sortBy === 'price') {
    query = query.order('price', { ascending: true })
  } else if (filters?.sortBy === 'rating') {
    query = query.order('rating', { ascending: false, nullsFirst: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    return createErrorResponse('Unable to load dishes.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapDish))
}

export async function getAllDishes(): Promise<
  ServiceResponse<DishWithCategory[]>
> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*, categories(name)')
    .order('created_at', { ascending: false })

  if (error) {
    return createErrorResponse('Unable to load dishes.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapDishWithCategory))
}

export async function getDish(id: string): Promise<ServiceResponse<Dish>> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load dish.', error.message)
  }

  if (!data) {
    return createErrorResponse('Dish not found.')
  }

  return createSuccessResponse(mapDish(data))
}

export async function getDishBySlug(
  slug: string,
): Promise<ServiceResponse<Dish>> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load dish.', error.message)
  }

  if (!data) {
    return createErrorResponse('Dish not found.')
  }

  return createSuccessResponse(mapDish(data))
}

export async function createDish(
  input: DishFormInput,
): Promise<ServiceResponse<Dish>> {
  const name = input.name.trim()

  if (!name) {
    return createErrorResponse('Dish name is required.')
  }

  if (!input.categoryId) {
    return createErrorResponse('Category is required.')
  }

  if (!input.price || input.price <= 0) {
    return createErrorResponse('Price must be greater than zero.')
  }

  const dishId = crypto.randomUUID()
  const imageResult = await resolveImageUrl(dishId, input)

  if (!imageResult.success) {
    return imageResult
  }

  const { data, error } = await supabase
    .from('dishes')
    .insert({
      id: dishId,
      name,
      slug: generateSlug(name),
      description: input.description?.trim() || null,
      ingredients: input.ingredients?.trim() || null,
      category_id: input.categoryId,
      price: input.price,
      calories: input.calories ?? null,
      preparation_time: input.preparationTime ?? null,
      image_url: imageResult.data,
      is_veg: input.isVeg,
      is_available: input.isAvailable ?? true,
      is_featured: input.isFeatured ?? false,
      spice_level: input.spiceLevel ?? null,
    })
    .select()
    .single()

  if (error) {
    return createErrorResponse(mapDatabaseError(error.message), error.message)
  }

  return createSuccessResponse(mapDish(data))
}

export async function updateDish(
  id: string,
  input: Partial<DishFormInput>,
): Promise<ServiceResponse<Dish>> {
  const updates: Record<string, unknown> = {}

  if (input.name !== undefined) {
    const name = input.name.trim()

    if (!name) {
      return createErrorResponse('Dish name is required.')
    }

    updates.name = name
    updates.slug = generateSlug(name)
  }

  if (input.description !== undefined) {
    updates.description = input.description.trim() || null
  }

  if (input.ingredients !== undefined) {
    updates.ingredients = input.ingredients.trim() || null
  }

  if (input.categoryId !== undefined) {
    if (!input.categoryId) {
      return createErrorResponse('Category is required.')
    }

    updates.category_id = input.categoryId
  }

  if (input.price !== undefined) {
    if (input.price <= 0) {
      return createErrorResponse('Price must be greater than zero.')
    }

    updates.price = input.price
  }

  if (input.calories !== undefined) {
    updates.calories = input.calories ?? null
  }

  if (input.preparationTime !== undefined) {
    updates.preparation_time = input.preparationTime ?? null
  }

  if (input.isVeg !== undefined) {
    updates.is_veg = input.isVeg
  }

  if (input.isAvailable !== undefined) {
    updates.is_available = input.isAvailable
  }

  if (input.isFeatured !== undefined) {
    updates.is_featured = input.isFeatured
  }

  if (input.spiceLevel !== undefined) {
    updates.spice_level = input.spiceLevel
  }

  if (input.imageFile || input.imageUrl !== undefined) {
    const imageResult = await resolveImageUrl(id, {
      imageFile: input.imageFile,
      imageUrl: input.imageUrl,
    })

    if (!imageResult.success) {
      return imageResult
    }

    updates.image_url = imageResult.data
  }

  if (Object.keys(updates).length === 0) {
    return createErrorResponse('No changes provided.')
  }

  const { data, error } = await supabase
    .from('dishes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return createErrorResponse(mapDatabaseError(error.message), error.message)
  }

  return createSuccessResponse(mapDish(data))
}

export async function deleteDish(id: string): Promise<ServiceResponse<null>> {
  const { error } = await supabase
    .from('dishes')
    .update({ is_available: false })
    .eq('id', id)

  if (error) {
    return createErrorResponse('Unable to delete dish.', error.message)
  }

  return createSuccessResponse(null)
}

// Backward-compatible alias
export type CreateDishInput = DishFormInput
