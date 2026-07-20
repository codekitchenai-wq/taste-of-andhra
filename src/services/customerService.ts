import type { ServiceResponse } from '@/types/api'
import type { Profile } from '@/types/Profile'

export interface CustomerSearchParams {
  search?: string
  page?: number
  limit?: number
}

export interface CustomerDetails extends Profile {
  totalSpend: number
  orderCount: number
}

export async function getCustomers(
  _params?: CustomerSearchParams,
): Promise<ServiceResponse<Profile[]>> {
  throw new Error('Not implemented')
}

export async function getCustomerDetails(
  _customerId: string,
): Promise<ServiceResponse<CustomerDetails>> {
  throw new Error('Not implemented')
}
