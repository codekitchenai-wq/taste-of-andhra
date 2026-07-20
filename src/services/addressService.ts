import type { ServiceResponse } from '@/types/api'
import type { Address } from '@/types/Address'

export interface CreateAddressInput {
  addressType: string
  fullName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  landmark?: string
  city: string
  state: string
  pincode: string
  isDefault?: boolean
}

export async function getAddresses(): Promise<ServiceResponse<Address[]>> {
  throw new Error('Not implemented')
}

export async function addAddress(
  _input: CreateAddressInput,
): Promise<ServiceResponse<Address>> {
  throw new Error('Not implemented')
}

export async function updateAddress(
  _id: string,
  _input: Partial<CreateAddressInput>,
): Promise<ServiceResponse<Address>> {
  throw new Error('Not implemented')
}

export async function deleteAddress(
  _id: string,
): Promise<ServiceResponse<null>> {
  throw new Error('Not implemented')
}

export async function setDefaultAddress(
  _id: string,
): Promise<ServiceResponse<Address>> {
  throw new Error('Not implemented')
}
