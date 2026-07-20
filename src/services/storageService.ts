import {
  createErrorResponse,
  createSuccessResponse,
  type ServiceResponse,
} from '@/types/api'
import { STORAGE_BUCKET } from '@/constants/APP'
import { supabase } from '@/services/supabaseClient'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export async function uploadDishImage(
  file: File,
  dishId: string,
): Promise<ServiceResponse<string>> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return createErrorResponse('Only JPEG, PNG, and WebP images are allowed.')
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return createErrorResponse('Image must be smaller than 5 MB.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `dishes/${dishId}/${Date.now()}.${extension}`

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
