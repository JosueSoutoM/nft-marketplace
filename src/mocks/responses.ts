import { HttpResponse } from 'msw'
import type { ApiErrorBody, ApiErrorCode, ApiErrorDetails, FieldErrors } from '@/api/contracts'

export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  fieldErrors?: FieldErrors,
  details?: ApiErrorDetails,
): Response {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
      ...(details ? { details } : {}),
    },
  }
  return HttpResponse.json(body, { status })
}

export function jsonResponse<T extends object>(body: T, status = 200, headers?: HeadersInit): Response {
  return HttpResponse.json(body, { status, headers })
}

export function noContentResponse(): Response {
  return new HttpResponse(null, { status: 204 })
}

export function networkErrorResponse(): Response {
  return HttpResponse.error()
}
