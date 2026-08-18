import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import { STORAGE_BUCKET } from '@/constants/APP'
import { getResolvedOrganizationId } from '@/services/currentOrganization'
import { supabase } from '@/services/supabaseClient'
import { restaurantImageObjectPath } from '@/utils/restaurantImagePath'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

/**
 * Admin uploads go to the shared restaurant-images bucket under
 * orgs/{organizationId}/ so Taste of Andhra and other restaurants never share
 * object keys. DirectApp Master can still write any prefix via RLS.
 */
async function uploadImage(
  file: File,
  folder: 'dishes' | 'categories',
  entityId: string,
): Promise<ServiceResponse<string>> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return createErrorResponse('Only JPEG, PNG, and WebP images are allowed.')
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return createErrorResponse('Image must be smaller than 5 MB.')
  }

  const organizationId = getResolvedOrganizationId()
  if (!organizationId) {
    return createErrorResponse('Restaurant is not ready. Refresh and try again.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = restaurantImageObjectPath(
    organizationId,
    folder,
    entityId,
    `${Date.now()}.${extension}`,
  )

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) {
    return createErrorResponse('Failed to upload image.', error.message)
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)

  return createSuccessResponse(data.publicUrl)
}

export async function uploadDishImage(
  file: File,
  dishId: string,
): Promise<ServiceResponse<string>> {
  return uploadImage(file, 'dishes', dishId)
}

export async function uploadCategoryImage(
  file: File,
  categoryId: string,
): Promise<ServiceResponse<string>> {
  return uploadImage(file, 'categories', categoryId)
}
