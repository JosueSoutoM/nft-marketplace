import { HttpResponse } from 'msw'
import type { ApiErrorBody, ApiErrorCode, FieldErrors } from '@/api/contracts'

export function errorResponse(status: number, code: ApiErrorCode, message: string, fieldErrors?: FieldErrors): Response {
  const body: ApiErrorBody = { error: fieldErrors ? { code, message, fieldErrors } : { code, message } }
  return HttpResponse.json(body, { status })
}

export function jsonResponse<T extends object>(body: T, status = 200): Response {
  return HttpResponse.json(body, { status })
}

export function noContentResponse(): Response {
  return new HttpResponse(null, { status: 204 })
}

export function networkErrorResponse(): Response {
  return HttpResponse.error()
}
