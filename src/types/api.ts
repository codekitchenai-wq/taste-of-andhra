export interface ServiceSuccessResponse<T> {
  success: true
  data: T
}

export interface ServiceErrorResponse {
  success: false
  message: string
  error?: string
}

export type ServiceResponse<T> =
  | ServiceSuccessResponse<T>
  | ServiceErrorResponse

export function createSuccessResponse<T>(data: T): ServiceSuccessResponse<T> {
  return { success: true, data }
}

export function createErrorResponse(
  message: string,
  error?: string,
): ServiceErrorResponse {
  return { success: false, message, error }
}
