import type { ServiceResponse } from '@/types/api'
import type { OrderStatus, PaymentMethod } from '@/types/enums'
import type { Order, OrderWithDetails } from '@/types/Order'

export interface CreateOrderInput {
  addressId: string
  paymentMethod: PaymentMethod
  specialInstructions?: string
}

export async function getCustomerOrders(): Promise<
  ServiceResponse<Order[]>
> {
  throw new Error('Not implemented')
}

export async function getOrderDetails(
  _orderId: string,
): Promise<ServiceResponse<OrderWithDetails>> {
  throw new Error('Not implemented')
}

export async function createOrder(
  _input: CreateOrderInput,
): Promise<ServiceResponse<Order>> {
  throw new Error('Not implemented')
}

export async function updateOrderStatus(
  _orderId: string,
  _status: OrderStatus,
): Promise<ServiceResponse<Order>> {
  throw new Error('Not implemented')
}

export async function cancelOrder(
  _orderId: string,
): Promise<ServiceResponse<Order>> {
  throw new Error('Not implemented')
}
