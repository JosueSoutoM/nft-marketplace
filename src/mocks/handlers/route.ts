import { delay, http, type HttpHandler } from 'msw'
import { API_BASE_PATH } from '@/api/contracts'
import { ENDPOINTS, type EndpointId } from '../endpoints'
import { errorResponse } from '../responses'
import { nextLatencyMs, scenarioFailure } from '../scenarios'

export type RouteParams = Record<string, string>

export type RouteResolver = (args: { request: Request; params: RouteParams }) => Response | Promise<Response>

const methods = {
  GET: http.get,
  POST: http.post,
  PUT: http.put,
  PATCH: http.patch,
  DELETE: http.delete,
} as const

const apiBaseUrl = import.meta.env.VITE_API_URL ?? API_BASE_PATH

export function apiRoute(endpoint: EndpointId, resolver: RouteResolver): HttpHandler {
  const { method, path } = ENDPOINTS[endpoint]
  return methods[method](`${apiBaseUrl}${path}`, async ({ request, params }) => {
    const latency = nextLatencyMs()
    if (latency > 0) {
      await delay(latency)
    }
    const failure = scenarioFailure(endpoint)
    if (failure) {
      return failure
    }
    try {
      return await resolver({ request, params: params as RouteParams })
    } catch (error) {
      if (error instanceof Response) {
        return error
      }
      console.error('[mocks] Erro inesperado no handler', endpoint, error)
      return errorResponse(500, 'INTERNAL_ERROR', 'Erro interno no servidor.')
    }
  })
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json()
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return body as Record<string, unknown>
    }
  } catch {
    throw errorResponse(400, 'BAD_REQUEST', 'O corpo da requisição deve ser um JSON válido.')
  }
  throw errorResponse(400, 'BAD_REQUEST', 'O corpo da requisição deve ser um objeto JSON.')
}

export function stringField(body: Record<string, unknown>, key: string): string {
  const value = body[key]
  return typeof value === 'string' ? value : ''
}
