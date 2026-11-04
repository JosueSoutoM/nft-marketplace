import { IDEMPOTENCY_HEADER, type CreateOrderRequest, type Order, type OrderListQuery, type OrderListResponse } from './contracts'
import { ApiError } from './errors'
import { http, type RequestOptions } from './http'

export const ORDER_REQUEST_TIMEOUT_MS = 10_000

export interface CreateOrderOptions extends RequestOptions {
  idempotencyKey: string
}

export function createIdempotencyKey(): string {
  return crypto.randomUUID()
}

export async function createOrder(
  body: CreateOrderRequest,
  { idempotencyKey, signal }: CreateOrderOptions,
): Promise<Order> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, ORDER_REQUEST_TIMEOUT_MS)
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort)
  try {
    const { data } = await http.post<Order>('/orders', body, {
      headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
      signal: controller.signal,
      timeout: 0,
    })
    return data
  } catch (error) {
    if (timedOut) {
      throw new ApiError({ status: 0, code: 'TIMEOUT', message: 'O servidor demorou a responder. Tente novamente.' })
    }
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}

export async function listOrders(query: OrderListQuery = {}, { signal }: RequestOptions = {}): Promise<OrderListResponse> {
  const { data } = await http.get<OrderListResponse>('/orders', { params: query, signal })
  return data
}

export async function getOrder(orderId: string, { signal }: RequestOptions = {}): Promise<Order> {
  const { data } = await http.get<Order>(`/orders/${encodeURIComponent(orderId)}`, { signal })
  return data
}
