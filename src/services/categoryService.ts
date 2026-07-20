import type { ServiceResponse } from '@/types/api'
import type { Category } from '@/types/Category'

export interface CreateCategoryInput {
  name: string
  description?: string
  imageUrl?: string
  displayOrder?: number
}

export async function getCategories(): Promise<ServiceResponse<Category[]>> {
  throw new Error('Not implemented')
}

export async function createCategory(
  _input: CreateCategoryInput,
): Promise<ServiceResponse<Category>> {
  throw new Error('Not implemented')
}

export async function updateCategory(
  _id: string,
  _input: Partial<CreateCategoryInput>,
): Promise<ServiceResponse<Category>> {
  throw new Error('Not implemented')
}

export async function deleteCategory(
  _id: string,
): Promise<ServiceResponse<null>> {
  throw new Error('Not implemented')
}
