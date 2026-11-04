export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'NOT_FOUND',
  'EMAIL_TAKEN',
  'USERNAME_TAKEN',
  'AVAILABILITY_CONFLICT',
  'QUOTE_OUTDATED',
  'IDEMPOTENCY_KEY_REUSED',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'WALLET_CONNECTION_REJECTED',
  'PAYLOAD_TOO_LARGE',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export type FieldErrors = Record<string, string>

export interface ApiErrorPayload {
  code: ApiErrorCode
  message: string
  fieldErrors?: FieldErrors
}

export interface ApiErrorBody {
  error: ApiErrorPayload
}
