import axios from 'axios'
import { API_ERROR_CODES, type ApiErrorBody, type ApiErrorCode, type FieldErrors } from './contracts'

export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELED' | 'UNKNOWN_ERROR'

export interface ApiErrorInit {
  status: number
  code: ApiErrorCode | ClientErrorCode
  message: string
  fieldErrors?: FieldErrors
}

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode | ClientErrorCode
  readonly fieldErrors: FieldErrors

  constructor({ status, code, message, fieldErrors }: ApiErrorInit) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors ?? {}
  }

  get isTransient(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT' || this.status >= 500
  }
}

const FALLBACK_BY_STATUS: Record<number, { code: ApiErrorCode; message: string }> = {
  400: { code: 'BAD_REQUEST', message: 'Requisição inválida.' },
  401: { code: 'UNAUTHENTICATED', message: 'Entre na sua conta para continuar.' },
  403: { code: 'FORBIDDEN', message: 'Você não tem permissão para acessar este recurso.' },
  404: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' },
  413: { code: 'PAYLOAD_TOO_LARGE', message: 'O conteúdo enviado é grande demais.' },
  422: { code: 'VALIDATION_ERROR', message: 'Revise os dados informados.' },
  503: { code: 'SERVICE_UNAVAILABLE', message: 'Serviço temporariamente indisponível.' },
}

function isApiErrorBody(data: unknown): data is ApiErrorBody {
  if (!data || typeof data !== 'object' || !('error' in data)) {
    return false
  }
  const { error } = data as { error: unknown }
  return (
    !!error &&
    typeof error === 'object' &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (API_ERROR_CODES as readonly unknown[]).includes((error as { code?: unknown }).code)
  )
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }
  if (axios.isCancel(error)) {
    return new ApiError({ status: 0, code: 'CANCELED', message: 'A requisição foi cancelada.' })
  }
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ status: 0, code: 'TIMEOUT', message: 'O servidor demorou a responder. Tente novamente.' })
    }
    if (error.response) {
      const { status, data } = error.response
      if (isApiErrorBody(data)) {
        return new ApiError({ status, ...data.error })
      }
      const fallback =
        FALLBACK_BY_STATUS[status] ??
        (status >= 500
          ? { code: 'INTERNAL_ERROR' as const, message: 'Erro no servidor. Tente novamente.' }
          : { code: 'UNKNOWN_ERROR' as const, message: 'Não foi possível concluir a operação.' })
      return new ApiError({ status, ...fallback })
    }
    return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Sem conexão com o servidor. Verifique sua rede.' })
  }
  return new ApiError({ status: 0, code: 'UNKNOWN_ERROR', message: 'Não foi possível concluir a operação.' })
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
