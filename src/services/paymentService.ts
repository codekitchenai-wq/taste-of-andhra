import type { ServiceResponse } from '@/types/api'
import type { PaymentMethod } from '@/types/enums'
import type { Payment } from '@/types/Payment'

export async function createPayment(
  _orderId: string,
  _method: PaymentMethod,
): Promise<ServiceResponse<Payment>> {
  throw new Error('Not implemented')
}

export async function updatePayment(
  _paymentId: string,
  _updates: Partial<Payment>,
): Promise<ServiceResponse<Payment>> {
  throw new Error('Not implemented')
}

export async function verifyPayment(
  _transactionId: string,
): Promise<ServiceResponse<Payment>> {
  throw new Error('Not implemented')
}
