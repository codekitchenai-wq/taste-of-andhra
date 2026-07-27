import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import type { Category } from '@/types/Category'
import { DEFAULT_ORGANIZATION_ID } from '@/constants/ORGANIZATION'
import { supabase } from '@/services/supabaseClient'
import { mapCategory } from '@/utils/mapCategory'
import { generateSlug } from '@/utils/slug'
import { uploadCategoryImage } from '@/services/storageService'

export interface CategoryFormInput {
  name: string
  description?: string
  imageUrl?: string
  imageFile?: File | null
  displayOrder?: number
  isActive?: boolean
}

function mapDatabaseError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('duplicate key') && normalized.includes('slug')) {
    return 'A category with this name already exists.'
  }

  if (normalized.includes('duplicate key') && normalized.includes('name')) {
    return 'A category with this name already exists.'
  }

  return message
}

export async function getCategories(): Promise<ServiceResponse<Category[]>> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    return createErrorResponse('Unable to load categories.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapCategory))
}

export async function getAllCategories(): Promise<ServiceResponse<Category[]>> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return createErrorResponse('Unable to load categories.', error.message)
  }

  return createSuccessResponse((data ?? []).map(mapCategory))
}

export async function getCategoryById(
  id: string,
): Promise<ServiceResponse<Category>> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return createErrorResponse('Unable to load category.', error.message)
  }

  if (!data) {
    return createErrorResponse('Category not found.')
  }

  return createSuccessResponse(mapCategory(data))
}

export async function createCategory(
  input: CategoryFormInput,
): Promise<ServiceResponse<Category>> {
  const name = input.name.trim()

  if (!name) {
    return createErrorResponse('Category name is required.')
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      organization_id: DEFAULT_ORGANIZATION_ID,
      name,
      slug: generateSlug(name),
      description: input.description?.trim() || null,
      image_url: input.imageUrl?.trim() || null,
      display_order: input.displayOrder ?? 0,
      is_active: input.isActive ?? true,
    })
    .select()
    .single()

  if (error) {
    return createErrorResponse(
      mapDatabaseError(error.message),
      error.message,
    )
  }

  if (input.imageFile) {
    const uploadResult = await uploadCategoryImage(input.imageFile, data.id)

    if (!uploadResult.success) {
      return uploadResult
    }

    const { data: updated, error: updateError } = await supabase
      .from('categories')
      .update({ image_url: uploadResult.data })
      .eq('id', data.id)
      .select()
      .single()

    if (updateError) {
      return createErrorResponse(
        'Category created but image upload failed to save.',
        updateError.message,
      )
    }

    return createSuccessResponse(mapCategory(updated))
  }

  return createSuccessResponse(mapCategory(data))
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryFormInput>,
): Promise<ServiceResponse<Category>> {
  const updates: Record<string, unknown> = {}

  if (input.name !== undefined) {
    const name = input.name.trim()

    if (!name) {
      return createErrorResponse('Category name is required.')
    }

    updates.name = name
    updates.slug = generateSlug(name)
  }

  if (input.description !== undefined) {
    updates.description = input.description.trim() || null
  }

  if (input.imageFile) {
    const uploadResult = await uploadCategoryImage(input.imageFile, id)

    if (!uploadResult.success) {
      return uploadResult
    }

    updates.image_url = uploadResult.data
  } else if (input.imageUrl !== undefined) {
    updates.image_url = input.imageUrl.trim() || null
  }

  if (input.displayOrder !== undefined) {
    updates.display_order = input.displayOrder
  }

  if (input.isActive !== undefined) {
    updates.is_active = input.isActive
  }

  if (Object.keys(updates).length === 0) {
    return createErrorResponse('No changes provided.')
  }

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return createErrorResponse(
      mapDatabaseError(error.message),
      error.message,
    )
  }

  return createSuccessResponse(mapCategory(data))
}

export async function deleteCategory(
  id: string,
): Promise<ServiceResponse<null>> {
  const { error } = await supabase
    .from('categories')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return createErrorResponse('Unable to delete category.', error.message)
  }

  return createSuccessResponse(null)
}
