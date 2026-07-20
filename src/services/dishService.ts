import type { ServiceResponse } from '@/types/api'
import type { Dish } from '@/types/Dish'
import type { SpiceLevel } from '@/types/enums'

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

export interface CreateDishInput {
  name: string
  description?: string
  ingredients?: string
  categoryId: string
  price: number
  calories?: number
  preparationTime?: number
  imageUrl?: string
  isVeg: boolean
  isAvailable?: boolean
  isFeatured?: boolean
  spiceLevel?: SpiceLevel
}

export async function getDishes(
  _filters?: DishFilters,
): Promise<ServiceResponse<Dish[]>> {
  throw new Error('Not implemented')
}

export async function getDish(_id: string): Promise<ServiceResponse<Dish>> {
  throw new Error('Not implemented')
}

export async function getDishBySlug(
  _slug: string,
): Promise<ServiceResponse<Dish>> {
  throw new Error('Not implemented')
}

export async function createDish(
  _input: CreateDishInput,
): Promise<ServiceResponse<Dish>> {
  throw new Error('Not implemented')
}

export async function updateDish(
  _id: string,
  _input: Partial<CreateDishInput>,
): Promise<ServiceResponse<Dish>> {
  throw new Error('Not implemented')
}

export async function deleteDish(_id: string): Promise<ServiceResponse<null>> {
  throw new Error('Not implemented')
}
